import { createModelRegistry, type LanguageModel } from "@veritas/agent-core";
import { accounts, agentEvents, agentQuestions, agentRuns, asc, eq, files, inArray, users, workspaceMembers, workspaces } from "@veritas/db";
import { agentEventEnvelope, type AgentEventEnvelope, type ThreadDetail } from "@veritas/shared";
import { MockLanguageModelV4, simulateReadableStream } from "ai/test";
import { hashPassword } from "better-auth/crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { createDeps, type Deps } from "../deps";
import { loadEnv, type Env } from "../env";
import { RUNS_PER_WINDOW } from "./routes";

type StreamResult = Awaited<ReturnType<MockLanguageModelV4["doStream"]>>;
type Chunk = StreamResult["stream"] extends ReadableStream<infer T> ? T : never;

const url = process.env.DATABASE_URL;
const PASSWORD = "correct-horse-battery";

const finish = (reason: "stop" | "tool-calls"): Chunk => ({
  type: "finish",
  finishReason: { unified: reason, raw: undefined },
  usage: {
    inputTokens: { total: 20, noCache: 12, cacheRead: 8, cacheWrite: undefined },
    outputTokens: { total: 6, text: 6, reasoning: undefined },
  },
});
const textStep = (...deltas: string[]): Chunk[] => [
  { type: "text-start", id: "t" },
  ...deltas.map((delta): Chunk => ({ type: "text-delta", id: "t", delta })),
  { type: "text-end", id: "t" },
  finish("stop"),
];
const toolStep = (toolCallId: string, toolName: string, input: unknown): Chunk[] => [
  { type: "tool-call", toolCallId, toolName, input: JSON.stringify(input) },
  finish("tool-calls"),
];
const scripted = (...steps: Chunk[][]) => new MockLanguageModelV4({ doStream: steps.map((chunks) => ({ stream: simulateReadableStream({ chunks }) })) });

/** Streams one delta, then hangs until the run is aborted. */
const hangingModel = () =>
  new MockLanguageModelV4({
    doStream: async ({ abortSignal }) => ({
      stream: new ReadableStream<Chunk>({
        start(c) {
          c.enqueue({ type: "text-start", id: "t" });
          c.enqueue({ type: "text-delta", id: "t", delta: "Working on it" });
          abortSignal?.addEventListener("abort", () => c.error(new DOMException("aborted", "AbortError")));
        },
      }),
    }),
  });

const MODEL_FIXTURE = {
  models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-3-flash-preview"].map((id) => ({
    name: `models/${id}`,
    displayName: id,
    inputTokenLimit: 1_000_000,
    outputTokenLimit: 65_536,
    supportedGenerationMethods: ["generateContent"],
  })),
};

function parseSse(body: string): { ids: number[]; envelopes: AgentEventEnvelope[] } {
  const ids: number[] = [];
  const envelopes: AgentEventEnvelope[] = [];
  for (const block of body.split("\n\n")) {
    const id = /^id: (\d+)$/m.exec(block);
    const data = /^data: (.*)$/m.exec(block);
    if (id) ids.push(Number(id[1]));
    if (data) envelopes.push(agentEventEnvelope.parse(JSON.parse(data[1]!)));
  }
  return { ids, envelopes };
}

describe.skipIf(!url)("agent API (needs DATABASE_URL and REDIS_URL)", () => {
  let env: Env;
  let deps: Deps;
  let app: Awaited<ReturnType<typeof buildApp>>;
  const modelQueue: LanguageModel[] = [];
  const requestedModels: string[] = [];
  let registryFails = false;
  const createdUsers: string[] = [];

  type TestUser = { id: string; cookie: string; workspaceId: string };
  let alice: TestUser;
  let bob: TestUser;

  async function createUser(label: string, ip: string): Promise<TestUser> {
    const id = `test-${crypto.randomUUID()}`;
    const email = `${id}@example.test`;
    createdUsers.push(id);
    await deps.db.insert(users).values({ id, name: label, email, emailVerified: true });
    await deps.db.insert(accounts).values({ id: crypto.randomUUID(), accountId: id, providerId: "credential", userId: id, password: await hashPassword(PASSWORD) });
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/sign-in/email",
      headers: { origin: env.WEB_ORIGIN, "x-forwarded-for": ip },
      payload: { email, password: PASSWORD },
    });
    expect(res.statusCode).toBe(200);
    const setCookie = res.headers["set-cookie"];
    const cookie = (Array.isArray(setCookie) ? setCookie : [setCookie ?? ""]).map((c) => c.split(";")[0]).join("; ");
    const [ws] = await deps.db.insert(workspaces).values({ name: `${label} workspace`, ownerId: id }).returning();
    await deps.db.insert(workspaceMembers).values({ workspaceId: ws!.id, userId: id, role: "owner" });
    await deps.redis.del(`ratelimit:agent-run:${id}`);
    return { id, cookie, workspaceId: ws!.id };
  }

  const as = (user: TestUser) => ({ cookie: user.cookie });
  const base = (user: TestUser, workspaceId = user.workspaceId) => `/api/v1/workspaces/${workspaceId}/agent`;

  async function createThread(user: TestUser): Promise<string> {
    const res = await app.inject({ method: "POST", url: `${base(user)}/threads`, headers: as(user), payload: {} });
    expect(res.statusCode).toBe(201);
    return res.json<{ id: string }>().id;
  }

  async function send(user: TestUser, threadId: string, payload: Record<string, unknown>) {
    return app.inject({ method: "POST", url: `${base(user)}/threads/${threadId}/messages`, headers: as(user), payload });
  }

  /**
   * Waits until the run row is in one of `statuses` and its matching run-status
   * event is stored. The runtime updates the row before it emits the event (and,
   * for ask_user, before the ask-user event), so the row alone is not enough:
   * reading events or resuming the run at that point races the recorder.
   */
  async function waitForStatus(runId: string, statuses: string[]): Promise<string> {
    for (let i = 0; i < 200; i++) {
      const [run] = await deps.db.select({ status: agentRuns.status }).from(agentRuns).where(eq(agentRuns.id, runId));
      if (run && statuses.includes(run.status)) {
        const lastStatusEvent = (await eventsOf(runId)).filter((e) => e.type === "run-status").at(-1);
        if (lastStatusEvent?.payload.status === run.status) return run.status;
      }
      await new Promise((r) => setTimeout(r, 25));
    }
    throw new Error(`run ${runId} never reached ${statuses.join("/")}`);
  }

  async function eventsOf(runId: string) {
    return deps.db.select().from(agentEvents).where(eq(agentEvents.runId, runId)).orderBy(asc(agentEvents.seq));
  }

  beforeAll(async () => {
    env = loadEnv({ ...process.env, NODE_ENV: "test" });
    deps = createDeps(env);
    const registry = createModelRegistry({
      apiKey: "unused",
      preference: "pro,flash",
      fetchImpl: async () => (registryFails ? new Response("{}", { status: 400 }) : Response.json(MODEL_FIXTURE)),
      ttlMs: 0,
    });
    deps.agent = {
      registry,
      languageModel: (modelId) => {
        requestedModels.push(modelId);
        const next = modelQueue.shift();
        if (!next) throw new Error("test model queue is empty");
        return next;
      },
    };
    app = await buildApp(env, deps);
    const ipSuffix = Math.floor(Math.random() * 200) + 20;
    alice = await createUser("Alice", `203.0.113.${ipSuffix}`);
    bob = await createUser("Bob", `198.51.100.${ipSuffix}`);
    // Cold imports plus two real sign-ins take several seconds on a small machine.
  }, 60_000);

  beforeEach(() => {
    modelQueue.length = 0;
    requestedModels.length = 0;
    registryFails = false;
  });

  afterAll(async () => {
    await app?.close();
    if (createdUsers.length > 0) {
      await deps.db.delete(workspaces).where(inArray(workspaces.ownerId, createdUsers));
      await deps.db.delete(users).where(inArray(users.id, createdUsers));
      for (const id of createdUsers) await deps.redis.del(`ratelimit:agent-run:${id}`);
    }
    await deps?.close();
  }, 30_000);

  it("lists ranked models for a signed-in user only", async () => {
    expect((await app.inject({ method: "GET", url: "/api/v1/models" })).statusCode).toBe(401);
    const res = await app.inject({ method: "GET", url: "/api/v1/models", headers: as(alice) });
    expect(res.statusCode).toBe(200);
    const { models } = res.json<{ models: { id: string; isDefault: boolean }[] }>();
    expect(models.map((m) => m.id)).toEqual(["gemini-2.5-pro", "gemini-3-flash-preview", "gemini-2.5-flash"]);
    expect(models[0]!.isDefault).toBe(true);
  });

  it("answers a rejected key with calm copy and no key", async () => {
    registryFails = true;
    const res = await app.inject({ method: "GET", url: "/api/v1/models", headers: as(alice) });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ error: "Model provider unavailable, check GEMINI_API_KEY" });
  });

  it("returns 404 to non-members on every agent route", async () => {
    const threadId = await createThread(alice);
    const foreign = base(bob, alice.workspaceId);
    const someId = crypto.randomUUID();
    const attempts = [
      app.inject({ method: "GET", url: `${foreign}/threads`, headers: as(bob) }),
      app.inject({ method: "POST", url: `${foreign}/threads`, headers: as(bob), payload: {} }),
      app.inject({ method: "GET", url: `${foreign}/threads/${threadId}`, headers: as(bob) }),
      app.inject({ method: "POST", url: `${foreign}/threads/${threadId}/messages`, headers: as(bob), payload: { text: "hi" } }),
      app.inject({ method: "GET", url: `${foreign}/runs/${someId}/events`, headers: as(bob) }),
      app.inject({ method: "POST", url: `${foreign}/runs/${someId}/stop`, headers: as(bob) }),
      app.inject({ method: "POST", url: `${foreign}/questions/${someId}/answer`, headers: as(bob), payload: { optionLabel: "x" } }),
    ];
    for (const res of await Promise.all(attempts)) expect(res.statusCode).toBe(404);
    // Bob's own workspace route can't reach Alice's thread either.
    expect((await app.inject({ method: "GET", url: `${base(bob)}/threads/${threadId}`, headers: as(bob) })).statusCode).toBe(404);
  });

  it("creates and lists threads", async () => {
    const res = await app.inject({ method: "POST", url: `${base(alice)}/threads`, headers: as(alice), payload: { title: "Funds flow", mode: "analyst" } });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ title: "Funds flow", mode: "analyst" });
    const list = await app.inject({ method: "GET", url: `${base(alice)}/threads`, headers: as(alice) });
    expect(list.json<{ threads: { id: string }[] }>().threads.map((t) => t.id)).toContain(res.json<{ id: string }>().id);
  });

  it("runs a turn, persists ordered events and replays them over SSE with resume", async () => {
    const threadId = await createThread(alice);
    modelQueue.push(scripted(textStep("Hello", " there")));
    const res = await send(alice, threadId, { text: "Say hello", modelId: "gemini-2.5-flash" });
    expect(res.statusCode).toBe(202);
    const { runId } = res.json<{ runId: string }>();
    expect(await waitForStatus(runId, ["completed", "failed"])).toBe("completed");

    const [run] = await deps.db.select().from(agentRuns).where(eq(agentRuns.id, runId));
    expect(run?.modelId).toBe("gemini-2.5-flash");
    expect(requestedModels).toEqual(["gemini-2.5-flash"]);
    expect(run?.usage).toMatchObject({ inputTokens: 20, cachedInputTokens: 8, outputTokens: 6 });

    const rows = await eventsOf(runId);
    expect(rows.map((r) => r.seq)).toEqual(rows.map((_, i) => i + 1));
    expect(rows.map((r) => r.type)).toEqual(["run-status", "text-delta", "text-delta", "step-finish", "run-status"]);
    expect(rows.at(-1)?.payload).toMatchObject({ status: "completed", modelId: "gemini-2.5-flash" });

    const full = await app.inject({ method: "GET", url: `${base(alice)}/runs/${runId}/events`, headers: as(alice) });
    expect(full.statusCode).toBe(200);
    expect(full.headers["content-type"]).toContain("text/event-stream");
    expect(parseSse(full.body).ids).toEqual([1, 2, 3, 4, 5]);

    const afterQuery = await app.inject({ method: "GET", url: `${base(alice)}/runs/${runId}/events?after=2`, headers: as(alice) });
    expect(parseSse(afterQuery.body).ids).toEqual([3, 4, 5]);
    const afterHeader = await app.inject({ method: "GET", url: `${base(alice)}/runs/${runId}/events`, headers: { ...as(alice), "last-event-id": "4" } });
    const resumed = parseSse(afterHeader.body);
    expect(resumed.ids).toEqual([5]);
    expect(resumed.envelopes[0]?.event).toMatchObject({ type: "run-status", status: "completed" });

    const detail = await app.inject({ method: "GET", url: `${base(alice)}/threads/${threadId}`, headers: as(alice) });
    const body = detail.json<ThreadDetail>();
    expect(body.thread.title).toBe("Say hello");
    expect(body.messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(body.messages[0]?.provenance).toBeNull();
    const provenance = body.messages[1]?.provenance;
    expect(provenance?.modelId).toBe("gemini-2.5-flash");
    expect(Date.parse(provenance!.finishedAt)).toBeGreaterThanOrEqual(Date.parse(provenance!.startedAt));
    expect(body.latestRun).toMatchObject({ id: runId, status: "completed", modelId: "gemini-2.5-flash" });
  });

  it("uses the top-ranked model when none is picked, and rejects unknown ones", async () => {
    const threadId = await createThread(alice);
    expect((await send(alice, threadId, { text: "x", modelId: "gemini-0-ultra" })).statusCode).toBe(400);
    modelQueue.push(scripted(textStep("ok")));
    const res = await send(alice, threadId, { text: "x" });
    await waitForStatus(res.json<{ runId: string }>().runId, ["completed"]);
    expect(requestedModels).toEqual(["gemini-2.5-pro"]);
  });

  it("scopes list_workspace_files to the run's workspace, whatever the model asks", async () => {
    const insertFile = (user: TestUser, name: string) =>
      deps.db.insert(files).values({ workspaceId: user.workspaceId, kind: "doc", name, storage: "blob", storageRef: `k/${crypto.randomUUID()}`, mime: "application/json", createdBy: user.id });
    await insertFile(alice, "Alice term sheet");
    await insertFile(bob, "Bob secret plan");

    const threadId = await createThread(alice);
    modelQueue.push(scripted(toolStep("c1", "list_workspace_files", { workspaceId: bob.workspaceId }), textStep("One file.")));
    const { runId } = (await send(alice, threadId, { text: "What files do I have?" })).json<{ runId: string }>();
    expect(await waitForStatus(runId, ["completed", "failed"])).toBe("completed");

    const result = (await eventsOf(runId)).find((e) => e.type === "tool-result");
    const names = (result?.payload.output as { files: { name: string }[] }).files.map((f) => f.name);
    expect(names).toContain("Alice term sheet");
    expect(names).not.toContain("Bob secret plan");
  });

  it("rejects a context chip pointing at another workspace's file", async () => {
    const [bobFile] = await deps.db
      .insert(files)
      .values({ workspaceId: bob.workspaceId, kind: "pdf", name: "private.pdf", storage: "blob", storageRef: "k/p", mime: "application/pdf", createdBy: bob.id })
      .returning();
    const threadId = await createThread(alice);
    const res = await send(alice, threadId, { text: "Summarise this", context: [{ kind: "file", fileId: bobFile!.id }] });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ fields: { context: expect.any(String) } });
  });

  it("pauses on ask_user and resumes with the answer", async () => {
    const threadId = await createThread(alice);
    const question = { question: "What kind of agreement?", options: [{ label: "NDA" }, { label: "Service agreement" }], allowOther: true };
    const resumeModel = scripted(textStep("Drafting an NDA."));
    modelQueue.push(scripted(toolStep("q1", "ask_user", question)), resumeModel);

    const { runId } = (await send(alice, threadId, { text: "Draft the agreement" })).json<{ runId: string }>();
    expect(await waitForStatus(runId, ["awaiting_answer", "failed", "completed"])).toBe("awaiting_answer");

    const ask = (await eventsOf(runId)).find((e) => e.type === "ask-user");
    expect(ask?.payload).toMatchObject({ toolCallId: "q1", ...question });
    const questionId = (ask?.payload as { questionId: string }).questionId;
    const [row] = await deps.db.select().from(agentQuestions).where(eq(agentQuestions.id, questionId));
    expect(row?.status).toBe("pending");

    // Sending a new message while the question is open is refused.
    expect((await send(alice, threadId, { text: "hello?" })).statusCode).toBe(409);

    const answerUrl = `${base(alice)}/questions/${questionId}/answer`;
    expect((await app.inject({ method: "POST", url: answerUrl, headers: as(alice), payload: { optionLabel: "Lease" } })).statusCode).toBe(400);
    expect((await app.inject({ method: "POST", url: answerUrl, headers: as(alice), payload: {} })).statusCode).toBe(400);

    const answered = await app.inject({ method: "POST", url: answerUrl, headers: as(alice), payload: { optionLabel: "NDA" } });
    expect(answered.statusCode).toBe(202);
    expect(answered.json()).toEqual({ runId, status: "running" });
    expect(await waitForStatus(runId, ["completed", "failed"])).toBe("completed");
    expect(JSON.stringify(resumeModel.doStreamCalls[0]!.prompt)).toContain('"answer":"NDA"');

    expect((await app.inject({ method: "POST", url: answerUrl, headers: as(alice), payload: { optionLabel: "NDA" } })).statusCode).toBe(409);

    const types = (await eventsOf(runId)).map((e) => e.type);
    expect(types.slice(0, 5)).toEqual(["run-status", "tool-call", "step-finish", "ask-user", "run-status"]);
    expect(types.at(-1)).toBe("run-status");
    const sse = parseSse((await app.inject({ method: "GET", url: `${base(alice)}/runs/${runId}/events`, headers: as(alice) })).body);
    expect(sse.ids).toEqual(sse.ids.map((_, i) => i + 1));
  });

  it("stops a live run and records it as cancelled", async () => {
    const threadId = await createThread(alice);
    modelQueue.push(hangingModel());
    const { runId } = (await send(alice, threadId, { text: "Do something long" })).json<{ runId: string }>();
    for (let i = 0; i < 200 && !(await eventsOf(runId)).some((e) => e.type === "text-delta"); i++) await new Promise((r) => setTimeout(r, 25));

    expect((await send(alice, threadId, { text: "another" })).statusCode).toBe(409);
    const stopped = await app.inject({ method: "POST", url: `${base(alice)}/runs/${runId}/stop`, headers: as(alice) });
    expect(stopped.statusCode).toBe(200);
    expect(stopped.json()).toEqual({ runId, status: "cancelled" });

    const rows = await eventsOf(runId);
    expect(rows.at(-1)?.payload).toMatchObject({ type: "run-status", status: "cancelled" });
    const detail = (await app.inject({ method: "GET", url: `${base(alice)}/threads/${threadId}`, headers: as(alice) })).json<ThreadDetail>();
    expect(detail.messages.at(-1)?.parts).toEqual([{ type: "text", text: "Working on it" }]);

    // Stopping again is a no-op that reports the final state.
    expect((await app.inject({ method: "POST", url: `${base(alice)}/runs/${runId}/stop`, headers: as(alice) })).json()).toEqual({ runId, status: "cancelled" });
  });

  it("rate-limits run creation per user", async () => {
    const threadId = await createThread(bob);
    await deps.redis.set(`ratelimit:agent-run:${bob.id}`, String(RUNS_PER_WINDOW), "EX", 60);
    const res = await send(bob, threadId, { text: "one more" });
    expect(res.statusCode).toBe(429);
    expect(Number(res.headers["x-retry-after"])).toBeGreaterThan(0);
    await deps.redis.del(`ratelimit:agent-run:${bob.id}`);
  });
});
