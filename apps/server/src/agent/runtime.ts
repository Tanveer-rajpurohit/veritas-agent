import {
  addUsage,
  ASK_USER_TOOL,
  askUserTool,
  emptyUsage,
  MAX_STEPS_PER_RUN,
  modelMessageSchema,
  runAgentTurn,
  type AskUserAnswer,
  type ModelMessage,
  type ResponseMessage,
} from "@veritas/agent-core";
import { agentMessages, agentQuestions, agentRuns, agentThreads, and, asc, eq, inArray, type Db } from "@veritas/db";
import {
  askUserInput,
  TERMINAL_RUN_STATUSES,
  tokenUsage,
  type AgentMode,
  type AnswerQuestionInput,
  type RunStatus,
  type TokenUsage,
} from "@veritas/shared";
import type { FastifyBaseLogger } from "fastify";
import type { Deps } from "../deps";
import { openRecorder, type EmitEvent } from "./events";
import { listWorkspaceFilesTool } from "./tools";

export const DEFAULT_THREAD_TITLE = "New chat";
const TITLE_FROM_MESSAGE_MAX = 60;
const OPEN_STATUSES: RunStatus[] = ["queued", "running", "awaiting_approval", "awaiting_answer"];

/** A 4xx the routes send as-is; the app error handler passes its message through. */
export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

type RunRow = { id: string; workspaceId: string; threadId: string; userId: string; mode: AgentMode; modelId: string; usage: TokenUsage | null };

const now = () => new Date();
const isoNow = () => new Date().toISOString();

function toParts(message: ResponseMessage): unknown[] {
  return typeof message.content === "string" ? [{ type: "text", text: message.content }] : message.content;
}

function parseUsage(value: unknown): TokenUsage | null {
  const parsed = tokenUsage.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** Finds a run the caller owns inside the workspace. Threads are private to the user who started them. */
export async function findOwnedRun(db: Db, workspaceId: string, userId: string, runId: string) {
  const [row] = await db
    .select({
      id: agentRuns.id,
      workspaceId: agentRuns.workspaceId,
      threadId: agentRuns.threadId,
      userId: agentThreads.userId,
      mode: agentRuns.mode,
      modelId: agentRuns.modelId,
      status: agentRuns.status,
      usage: agentRuns.usage,
    })
    .from(agentRuns)
    .innerJoin(agentThreads, eq(agentThreads.id, agentRuns.threadId))
    .where(and(eq(agentRuns.id, runId), eq(agentRuns.workspaceId, workspaceId), eq(agentThreads.workspaceId, workspaceId), eq(agentThreads.userId, userId)))
    .limit(1);
  return row ? { ...row, mode: row.mode as AgentMode, usage: parseUsage(row.usage) } : null;
}

export function createAgentRuntime(deps: Deps, log: FastifyBaseLogger) {
  const active = new Map<string, { controller: AbortController; done: Promise<void> }>();
  const tools = [listWorkspaceFilesTool(deps.db), askUserTool];

  async function loadHistory(threadId: string): Promise<ModelMessage[]> {
    const rows = await deps.db
      .select({ role: agentMessages.role, parts: agentMessages.parts })
      .from(agentMessages)
      .where(eq(agentMessages.threadId, threadId))
      // created_at is the transaction time, so rows written together tie; uuidv7 ids break the tie in insert order.
      .orderBy(asc(agentMessages.createdAt), asc(agentMessages.id));
    return rows.map((r) => modelMessageSchema.parse({ role: r.role, content: r.parts }));
  }

  async function setStatus(runId: string, status: RunStatus, extra: { usage?: TokenUsage; errorCode?: string } = {}) {
    const isTerminal = TERMINAL_RUN_STATUSES.includes(status);
    await deps.db
      .update(agentRuns)
      .set({ status, ...extra, ...(isTerminal ? { finishedAt: now() } : {}) })
      .where(eq(agentRuns.id, runId));
  }

  async function execute(run: RunRow, signal: AbortSignal) {
    const emit: EmitEvent = await openRecorder(deps, log, run.id);
    const status = (s: RunStatus) => emit({ type: "run-status", status: s, modelId: run.modelId, at: isoNow() });
    try {
      await status("running");
      const outcome = await runAgentTurn({
        model: deps.agent.languageModel(run.modelId),
        mode: run.mode,
        history: await loadHistory(run.threadId),
        tools,
        context: { workspaceId: run.workspaceId, userId: run.userId, runId: run.id },
        emit,
        abortSignal: signal,
      });

      if (outcome.messages.length > 0) {
        await deps.db
          .insert(agentMessages)
          .values(outcome.messages.map((m) => ({ threadId: run.threadId, role: m.role, parts: toParts(m), runId: run.id, modelId: run.modelId })));
      }
      const usage = addUsage(run.usage ?? emptyUsage(), outcome.usage);

      switch (outcome.status) {
        case "completed":
          if (outcome.hitStepLimit) {
            await emit({
              type: "error",
              code: "step_limit",
              message: `Stopped after ${MAX_STEPS_PER_RUN} steps. Ask me to continue if you need more.`,
              retryable: false,
            });
          }
          await setStatus(run.id, "completed", { usage });
          await status("completed");
          break;
        case "awaiting_answer": {
          const [question] = await deps.db
            .insert(agentQuestions)
            .values({ runId: run.id, toolCallId: outcome.question.toolCallId, questions: [outcome.question.input] })
            .returning({ id: agentQuestions.id });
          await setStatus(run.id, "awaiting_answer", { usage });
          await emit({ type: "ask-user", questionId: question!.id, toolCallId: outcome.question.toolCallId, ...outcome.question.input });
          await status("awaiting_answer");
          break;
        }
        case "cancelled":
          await setStatus(run.id, "cancelled", { usage });
          await status("cancelled");
          break;
        case "failed":
          log.warn({ runId: run.id, code: outcome.error.code, statusCode: outcome.error.statusCode }, "agent run failed");
          await emit({ type: "error", code: outcome.error.code, message: outcome.error.message, retryable: outcome.error.retryable });
          await setStatus(run.id, "failed", { usage, errorCode: outcome.error.code });
          await status("failed");
          break;
      }
      await deps.db.update(agentThreads).set({ updatedAt: now() }).where(eq(agentThreads.id, run.threadId));
    } catch (error) {
      // Log the error class only: messages from the DB or provider can carry user content.
      log.error({ runId: run.id, error: error instanceof Error ? error.name : typeof error }, "agent run crashed");
      try {
        await emit({ type: "error", code: "internal", message: "Something went wrong while running the agent. Try again.", retryable: true });
        await setStatus(run.id, "failed", { errorCode: "internal" });
        await status("failed");
      } catch {
        log.error({ runId: run.id }, "could not record agent run failure");
      }
    }
  }

  function launch(run: RunRow) {
    const controller = new AbortController();
    const done = execute(run, controller.signal).finally(() => active.delete(run.id));
    active.set(run.id, { controller, done });
  }

  return {
    /** Records the user message and a new run, then starts it in the background. Returns null when the thread isn't the caller's. */
    async startRun(input: {
      workspaceId: string;
      threadId: string;
      userId: string;
      modelId: string;
      mode?: AgentMode;
      parts: unknown[];
      titleHint: string;
    }) {
      const created = await deps.db.transaction(async (tx) => {
        // Row lock serialises sends on one thread, so two runs can't start at once.
        const [thread] = await tx
          .select({ id: agentThreads.id, mode: agentThreads.mode, title: agentThreads.title })
          .from(agentThreads)
          .where(and(eq(agentThreads.id, input.threadId), eq(agentThreads.workspaceId, input.workspaceId), eq(agentThreads.userId, input.userId)))
          .for("update");
        if (!thread) return null;

        const [busy] = await tx
          .select({ id: agentRuns.id })
          .from(agentRuns)
          .where(and(eq(agentRuns.threadId, thread.id), inArray(agentRuns.status, OPEN_STATUSES)))
          .limit(1);
        if (busy) throw new HttpError(409, "The agent is still working in this chat. Stop it or answer its question first.");

        const mode = input.mode ?? (thread.mode as AgentMode);
        const [run] = await tx
          .insert(agentRuns)
          .values({ workspaceId: input.workspaceId, threadId: thread.id, mode, modelId: input.modelId, status: "running", startedAt: now() })
          .returning({ id: agentRuns.id });
        const [message] = await tx
          .insert(agentMessages)
          .values({ threadId: thread.id, role: "user", parts: input.parts, runId: run!.id })
          .returning({ id: agentMessages.id });
        const title = thread.title === DEFAULT_THREAD_TITLE ? input.titleHint.slice(0, TITLE_FROM_MESSAGE_MAX) : thread.title;
        await tx.update(agentThreads).set({ title, mode, updatedAt: now() }).where(eq(agentThreads.id, thread.id));
        return { runId: run!.id, messageId: message!.id, mode };
      });
      if (!created) return null;

      launch({
        id: created.runId,
        workspaceId: input.workspaceId,
        threadId: input.threadId,
        userId: input.userId,
        mode: created.mode,
        modelId: input.modelId,
        usage: null,
      });
      return { runId: created.runId, messageId: created.messageId };
    },

    /** Records the answer as the ask_user tool result and resumes the same run. Returns null when not found. */
    async answer(input: { workspaceId: string; userId: string; questionId: string; answer: AnswerQuestionInput }) {
      const [row] = await deps.db
        .select({ question: agentQuestions, runId: agentRuns.id })
        .from(agentQuestions)
        .innerJoin(agentRuns, eq(agentRuns.id, agentQuestions.runId))
        .innerJoin(agentThreads, eq(agentThreads.id, agentRuns.threadId))
        .where(and(eq(agentQuestions.id, input.questionId), eq(agentThreads.workspaceId, input.workspaceId), eq(agentThreads.userId, input.userId)))
        .limit(1);
      if (!row) return null;
      const run = await findOwnedRun(deps.db, input.workspaceId, input.userId, row.runId);
      if (!run) return null;
      if (row.question.status !== "pending" || run.status !== "awaiting_answer") throw new HttpError(409, "This question was already answered or the run has ended.");

      const asked = askUserInput.parse(row.question.questions[0]);
      let result: AskUserAnswer;
      if (input.answer.optionLabel !== undefined) {
        if (!asked.options.some((o) => o.label === input.answer.optionLabel)) throw new HttpError(400, "Pick one of the offered options.");
        result = { answer: input.answer.optionLabel, source: "option" };
      } else {
        if (!asked.allowOther) throw new HttpError(400, "This question only accepts one of the offered options.");
        result = { answer: input.answer.otherText ?? "", source: "other" };
      }

      const claimed = await deps.db.transaction(async (tx) => {
        // Conditional update: two answers racing for one question can't both resume the run.
        const [updated] = await tx
          .update(agentQuestions)
          .set({ status: "answered", answers: { [result.source]: result.answer }, answeredAt: now() })
          .where(and(eq(agentQuestions.id, row.question.id), eq(agentQuestions.status, "pending")))
          .returning({ id: agentQuestions.id });
        if (!updated) return false;
        await tx.insert(agentMessages).values({
          threadId: run.threadId,
          role: "tool",
          runId: run.id,
          parts: [{ type: "tool-result", toolCallId: row.question.toolCallId, toolName: ASK_USER_TOOL, output: { type: "json", value: result } }],
        });
        await tx.update(agentRuns).set({ status: "running" }).where(eq(agentRuns.id, run.id));
        return true;
      });
      if (!claimed) throw new HttpError(409, "This question was already answered or the run has ended.");

      launch(run);
      return { runId: run.id, status: "running" as const };
    },

    /** Aborts a live run, or closes one that is paused or orphaned. Idempotent for finished runs. */
    async stop(input: { workspaceId: string; userId: string; runId: string }) {
      const run = await findOwnedRun(deps.db, input.workspaceId, input.userId, input.runId);
      if (!run) return null;
      const live = active.get(run.id);
      if (live) {
        live.controller.abort();
        await live.done;
      } else if (!TERMINAL_RUN_STATUSES.includes(run.status)) {
        const [updated] = await deps.db
          .update(agentRuns)
          .set({ status: "cancelled", finishedAt: now() })
          .where(and(eq(agentRuns.id, run.id), eq(agentRuns.status, run.status)))
          .returning({ id: agentRuns.id });
        if (updated) {
          const emit = await openRecorder(deps, log, run.id);
          await emit({ type: "run-status", status: "cancelled", modelId: run.modelId, at: isoNow() });
        }
      }
      const [current] = await deps.db.select({ status: agentRuns.status }).from(agentRuns).where(eq(agentRuns.id, run.id));
      return { runId: run.id, status: current!.status };
    },

    /** Stops every live run, for shutdown and test teardown. */
    async close() {
      const runs = [...active.values()];
      for (const run of runs) run.controller.abort();
      await Promise.all(runs.map((r) => r.done));
    },
  };
}

export type AgentRuntime = ReturnType<typeof createAgentRuntime>;
