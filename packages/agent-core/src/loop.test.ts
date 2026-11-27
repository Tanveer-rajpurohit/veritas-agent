import type { AgentEvent } from "@veritas/shared";
import { APICallError, type ModelMessage } from "ai";
import { MockLanguageModelV4, simulateReadableStream } from "ai/test";
import { z } from "zod";
import { describe, expect, it, vi } from "vitest";
import { runAgentTurn } from "./loop";
import { buildInstructions, closeDanglingToolCalls } from "./prompt";
import { askUserTool, defineTool, TOOL_FAILED_MESSAGE, type ToolContext } from "./tools";

type StreamResult = Awaited<ReturnType<MockLanguageModelV4["doStream"]>>;
type Chunk = StreamResult["stream"] extends ReadableStream<infer T> ? T : never;

const usage = (input: number, output: number, cached = 0) => ({
  inputTokens: { total: input, noCache: input - cached, cacheRead: cached, cacheWrite: undefined },
  outputTokens: { total: output, text: output, reasoning: undefined },
});

const finish = (reason: "stop" | "tool-calls", cached = 0): Chunk => ({
  type: "finish",
  finishReason: { unified: reason, raw: undefined },
  usage: usage(10, 5, cached),
});

const textStep = (...deltas: string[]): Chunk[] => [
  { type: "text-start", id: "t" },
  ...deltas.map((delta): Chunk => ({ type: "text-delta", id: "t", delta })),
  { type: "text-end", id: "t" },
  finish("stop", 4),
];

const toolStep = (toolCallId: string, toolName: string, input: unknown): Chunk[] => [
  { type: "tool-call", toolCallId, toolName, input: JSON.stringify(input) },
  finish("tool-calls"),
];

function mockModel(steps: Chunk[][]) {
  return new MockLanguageModelV4({
    doStream: steps.map((chunks) => ({ stream: simulateReadableStream({ chunks }) })),
  });
}

const ctx: ToolContext = { workspaceId: "ws-1", userId: "u-1", runId: "r-1" };

const listFiles = defineTool({
  name: "list_workspace_files",
  description: "List files",
  kind: "read",
  input: z.object({ limit: z.number().int().optional() }),
  execute: async (_input, toolCtx) => ({ files: [{ name: "Term sheet.pdf", workspace: toolCtx.workspaceId }] }),
});

function recorder() {
  const events: AgentEvent[] = [];
  return { events, emit: async (event: AgentEvent) => void events.push(event) };
}

const user = (text: string): ModelMessage => ({ role: "user", content: [{ type: "text", text }] });

describe("runAgentTurn", () => {
  it("streams text deltas and reports usage with cached tokens", async () => {
    const { events, emit } = recorder();
    const outcome = await runAgentTurn({
      model: mockModel([textStep("Hello", ", world")]),
      mode: "general",
      history: [user("hi")],
      tools: [listFiles, askUserTool],
      context: ctx,
      emit,
      abortSignal: new AbortController().signal,
    });

    expect(outcome.status).toBe("completed");
    expect(events.map((e) => e.type)).toEqual(["text-delta", "text-delta", "step-finish"]);
    expect(events.filter((e) => e.type === "text-delta").map((e) => e.text)).toEqual(["Hello", ", world"]);
    expect(outcome.usage).toEqual({ inputTokens: 10, outputTokens: 5, cachedInputTokens: 4, reasoningTokens: 0, totalTokens: 15 });
    expect(outcome.messages).toEqual([{ role: "assistant", content: [{ type: "text", text: "Hello, world" }] }]);
  });

  it("puts the stable prefix in instructions and keeps it identical across turns", async () => {
    const model = mockModel([textStep("a"), textStep("b")]);
    const base = { model, mode: "general" as const, tools: [listFiles, askUserTool], context: ctx, abortSignal: new AbortController().signal };
    const pinned = [{ name: "Term sheet.pdf", kind: "pdf" }];
    await runAgentTurn({ ...base, pinned, history: [user("one")], emit: async () => {} });
    await runAgentTurn({ ...base, pinned, history: [user("one"), { role: "assistant", content: "a" }, user("two")], emit: async () => {} });

    const [first, second] = model.doStreamCalls;
    expect(first!.prompt[0]).toEqual(second!.prompt[0]);
    expect(first!.prompt[0]).toMatchObject({ role: "system", content: buildInstructions("general", pinned) });
    expect(second!.prompt.at(-1)).toMatchObject({ role: "user" });
  });

  it("runs a tool with the bound workspace and emits call then result before the answer", async () => {
    const { events, emit } = recorder();
    const outcome = await runAgentTurn({
      model: mockModel([toolStep("c1", "list_workspace_files", { workspaceId: "someone-else" }), textStep("You have one file.")]),
      mode: "general",
      history: [user("what files do I have?")],
      tools: [listFiles, askUserTool],
      context: ctx,
      emit,
      abortSignal: new AbortController().signal,
    });

    expect(outcome.status).toBe("completed");
    expect(events.map((e) => e.type)).toEqual(["tool-call", "tool-result", "step-finish", "text-delta", "step-finish"]);
    const result = events.find((e) => e.type === "tool-result");
    expect(result).toMatchObject({ toolCallId: "c1", isError: false, output: { files: [{ workspace: "ws-1" }] } });
    expect(events.filter((e) => e.type === "step-finish").map((e) => e.step)).toEqual([0, 1]);
    expect(outcome.messages.map((m) => m.role)).toEqual(["assistant", "tool", "assistant"]);
  });

  it("hides internal tool errors from events and the model", async () => {
    const failing = defineTool({
      name: "list_workspace_files",
      description: "List files",
      kind: "read",
      input: z.object({}),
      execute: async () => {
        throw new Error("connection to 10.0.0.5:5432 refused");
      },
    });
    const { events, emit } = recorder();
    const outcome = await runAgentTurn({
      model: mockModel([toolStep("c1", "list_workspace_files", {}), textStep("I couldn't list files.")]),
      mode: "general",
      history: [user("files?")],
      tools: [failing],
      context: ctx,
      emit,
      abortSignal: new AbortController().signal,
    });
    expect(events.find((e) => e.type === "tool-result")).toMatchObject({ isError: true, output: TOOL_FAILED_MESSAGE });
    expect(JSON.stringify(outcome.messages)).not.toContain("10.0.0.5");
  });

  it("leaves gated tools out of the request", async () => {
    const model = mockModel([textStep("ok")]);
    const gated = defineTool({ name: "list_workspace_files", description: "x", kind: "gated", input: z.object({}), execute: async () => ({}) });
    await runAgentTurn({ model, mode: "general", history: [user("x")], tools: [gated, askUserTool], context: ctx, emit: async () => {}, abortSignal: new AbortController().signal });
    expect(model.doStreamCalls[0]!.tools?.map((t) => t.name)).toEqual(["ask_user"]);
  });

  it("pauses on ask_user, then resumes with the answer as the tool result", async () => {
    const question = { question: "What kind of agreement?", options: [{ label: "NDA" }, { label: "Service agreement" }], allowOther: true };
    const first = recorder();
    const paused = await runAgentTurn({
      model: mockModel([toolStep("q1", "ask_user", question)]),
      mode: "general",
      history: [user("Draft the agreement")],
      tools: [listFiles, askUserTool],
      context: ctx,
      emit: first.emit,
      abortSignal: new AbortController().signal,
    });

    expect(paused).toMatchObject({ status: "awaiting_answer", question: { toolCallId: "q1", input: question } });
    expect(first.events.map((e) => e.type)).toEqual(["tool-call", "step-finish"]);

    const resumeModel = mockModel([textStep("Drafting an NDA.")]);
    const history: ModelMessage[] = [
      user("Draft the agreement"),
      ...paused.messages,
      { role: "tool", content: [{ type: "tool-result", toolCallId: "q1", toolName: "ask_user", output: { type: "json", value: { answer: "NDA", source: "option" } } }] },
    ];
    const resumed = await runAgentTurn({
      model: resumeModel,
      mode: "general",
      history,
      tools: [listFiles, askUserTool],
      context: ctx,
      emit: async () => {},
      abortSignal: new AbortController().signal,
    });
    expect(resumed.status).toBe("completed");
    const sentToModel = JSON.stringify(resumeModel.doStreamCalls[0]!.prompt);
    expect(sentToModel).toContain('"answer":"NDA"');
  });

  it("stops when aborted and keeps the text streamed so far", async () => {
    const controller = new AbortController();
    const model = new MockLanguageModelV4({
      doStream: async ({ abortSignal }) => ({
        stream: new ReadableStream({
          start(c) {
            c.enqueue({ type: "text-start", id: "t" });
            c.enqueue({ type: "text-delta", id: "t", delta: "Partial" });
            abortSignal?.addEventListener("abort", () => c.error(new DOMException("aborted", "AbortError")));
          },
        }),
      }),
    });
    const { events, emit } = recorder();
    const outcome = await runAgentTurn({
      model,
      mode: "general",
      history: [user("long task")],
      tools: [],
      context: ctx,
      emit: async (event) => {
        await emit(event);
        if (event.type === "text-delta") controller.abort();
      },
      abortSignal: controller.signal,
    });
    expect(outcome.status).toBe("cancelled");
    expect(events.map((e) => e.type)).toEqual(["text-delta"]);
    expect(outcome.messages).toEqual([{ role: "assistant", content: [{ type: "text", text: "Partial" }] }]);
  });

  it("maps a provider 429 to a calm, retryable error", async () => {
    const model = new MockLanguageModelV4({
      doStream: async () => {
        throw new APICallError({ message: "Quota exceeded for key AIza-secret", url: "https://x", requestBodyValues: {}, statusCode: 429, isRetryable: false });
      },
    });
    const outcome = await runAgentTurn({ model, mode: "general", history: [user("x")], tools: [], context: ctx, emit: async () => {}, abortSignal: new AbortController().signal });
    expect(outcome).toMatchObject({ status: "failed", error: { code: "rate_limited", retryable: true } });
    expect(JSON.stringify(outcome)).not.toContain("AIza");
  });

  it("awaits each emit before the next, so events persist in stream order", async () => {
    const order: string[] = [];
    await runAgentTurn({
      model: mockModel([textStep("a", "b", "c")]),
      mode: "general",
      history: [user("x")],
      tools: [],
      context: ctx,
      emit: async (event) => {
        // A slow first write must not let later events overtake it.
        if (event.type === "text-delta" && event.text === "a") await new Promise((r) => setTimeout(r, 20));
        order.push(event.type === "text-delta" ? event.text : event.type);
      },
      abortSignal: new AbortController().signal,
    });
    expect(order).toEqual(["a", "b", "c", "step-finish"]);
  });

  it("reports when the step cap ends a tool loop", async () => {
    const steps = [toolStep("c1", "list_workspace_files", {}), toolStep("c2", "list_workspace_files", {})];
    const outcome = await runAgentTurn({
      model: mockModel(steps),
      mode: "general",
      history: [user("loop")],
      tools: [listFiles],
      context: ctx,
      emit: vi.fn(async () => {}),
      abortSignal: new AbortController().signal,
      maxSteps: 2,
    });
    expect(outcome).toMatchObject({ status: "completed", hitStepLimit: true });
  });
});

describe("closeDanglingToolCalls", () => {
  it("adds an error result for an unanswered call and merges into an existing tool message", () => {
    const history: ModelMessage[] = [
      user("x"),
      {
        role: "assistant",
        content: [
          { type: "tool-call", toolCallId: "a", toolName: "list_workspace_files", input: {} },
          { type: "tool-call", toolCallId: "b", toolName: "ask_user", input: {} },
        ],
      },
      { role: "tool", content: [{ type: "tool-result", toolCallId: "a", toolName: "list_workspace_files", output: { type: "json", value: [] } }] },
      user("never mind"),
    ];
    const closed = closeDanglingToolCalls(history);
    expect(closed).toHaveLength(4);
    const tool = closed[2];
    expect(tool?.role === "tool" && tool.content.map((p) => (p.type === "tool-result" ? p.toolCallId : ""))).toEqual(["a", "b"]);
  });

  it("inserts a tool message when none follows", () => {
    const history: ModelMessage[] = [{ role: "assistant", content: [{ type: "tool-call", toolCallId: "q", toolName: "ask_user", input: {} }] }, user("next")];
    const closed = closeDanglingToolCalls(history);
    expect(closed.map((m) => m.role)).toEqual(["assistant", "tool", "user"]);
  });
});
