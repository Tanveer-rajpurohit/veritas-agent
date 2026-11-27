import { z } from "zod";

/* ---------------- Models ---------------- */

export const modelInfo = z.object({
  id: z.string(),
  displayName: z.string(),
  inputTokenLimit: z.number().int().nonnegative(),
  outputTokenLimit: z.number().int().nonnegative(),
  isDefault: z.boolean(),
});
export type ModelInfo = z.infer<typeof modelInfo>;

export const modelList = z.object({ models: z.array(modelInfo) });
export type ModelList = z.infer<typeof modelList>;

/* ---------------- Modes and runs ---------------- */

export const agentMode = z.enum(["general", "legal", "analyst", "presenter", "researcher"]);
export type AgentMode = z.infer<typeof agentMode>;

export const runStatus = z.enum(["queued", "running", "awaiting_approval", "awaiting_answer", "completed", "failed", "cancelled"]);
export type RunStatus = z.infer<typeof runStatus>;

export const TERMINAL_RUN_STATUSES: readonly RunStatus[] = ["completed", "failed", "cancelled"];

export const tokenUsage = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  /** Input tokens served from Gemini's implicit or explicit cache. */
  cachedInputTokens: z.number().int().nonnegative(),
  reasoningTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
});
export type TokenUsage = z.infer<typeof tokenUsage>;

/* ---------------- ask_user (F059) ---------------- */

export const askUserOption = z.object({
  label: z.string().trim().min(1).max(80),
  description: z.string().trim().max(200).optional(),
});

export const askUserInput = z.object({
  question: z.string().trim().min(1).max(500),
  options: z.array(askUserOption).min(1).max(6),
  allowOther: z.boolean(),
});
export type AskUserInput = z.infer<typeof askUserInput>;

/* ---------------- Stream events ---------------- */

export const agentErrorCode = z.enum(["rate_limited", "provider_unavailable", "provider_error", "step_limit", "internal"]);
export type AgentErrorCode = z.infer<typeof agentErrorCode>;

export const agentEvent = z.discriminatedUnion("type", [
  z.object({ type: z.literal("reasoning-delta"), text: z.string() }),
  z.object({ type: z.literal("text-delta"), text: z.string() }),
  z.object({ type: z.literal("tool-call"), toolCallId: z.string(), toolName: z.string(), input: z.unknown() }),
  z.object({
    type: z.literal("tool-result"),
    toolCallId: z.string(),
    toolName: z.string(),
    output: z.unknown(),
    isError: z.boolean(),
  }),
  z.object({ type: z.literal("step-finish"), step: z.number().int().nonnegative(), finishReason: z.string(), usage: tokenUsage }),
  z.object({ type: z.literal("ask-user"), questionId: z.uuid(), toolCallId: z.string(), ...askUserInput.shape }),
  z.object({ type: z.literal("run-status"), status: runStatus, modelId: z.string(), at: z.iso.datetime() }),
  z.object({ type: z.literal("error"), code: agentErrorCode, message: z.string(), retryable: z.boolean() }),
]);
export type AgentEvent = z.infer<typeof agentEvent>;

/** What an SSE `data:` line carries. `seq` is also the SSE `id`, used for Last-Event-ID resume. */
export const agentEventEnvelope = z.object({ runId: z.uuid(), seq: z.number().int().positive(), event: agentEvent });
export type AgentEventEnvelope = z.infer<typeof agentEventEnvelope>;

/* ---------------- Threads and messages ---------------- */

export const THREAD_TITLE_MAX = 120;
export const MESSAGE_TEXT_MAX = 20_000;
export const CONTEXT_REFS_MAX = 20;

export const createThreadInput = z.object({
  title: z.string().trim().min(1).max(THREAD_TITLE_MAX).optional(),
  mode: agentMode.optional(),
});
export type CreateThreadInput = z.infer<typeof createThreadInput>;

export const threadSummary = z.object({
  id: z.uuid(),
  title: z.string(),
  mode: agentMode,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type ThreadSummary = z.infer<typeof threadSummary>;

export const threadList = z.object({ threads: z.array(threadSummary) });

/** F060: which model produced an AI output, and when. */
export const provenance = z.object({
  modelId: z.string(),
  startedAt: z.iso.datetime(),
  finishedAt: z.iso.datetime(),
});
export type Provenance = z.infer<typeof provenance>;

export const agentMessageRole = z.enum(["user", "assistant", "tool"]);

export const agentMessage = z.object({
  id: z.uuid(),
  role: agentMessageRole,
  /** AI SDK ModelMessage content parts. */
  parts: z.array(z.unknown()),
  runId: z.uuid().nullable(),
  createdAt: z.iso.datetime(),
  /** Null for user messages. */
  provenance: provenance.nullable(),
});
export type AgentMessage = z.infer<typeof agentMessage>;

export const runSummary = z.object({
  id: z.uuid(),
  status: runStatus,
  mode: agentMode,
  modelId: z.string(),
  usage: tokenUsage.nullable(),
  startedAt: z.iso.datetime().nullable(),
  finishedAt: z.iso.datetime().nullable(),
});
export type RunSummary = z.infer<typeof runSummary>;

export const threadDetail = z.object({
  thread: threadSummary,
  messages: z.array(agentMessage),
  /** The newest run, so a reloaded UI can reattach to its event stream. */
  latestRun: runSummary.nullable(),
});
export type ThreadDetail = z.infer<typeof threadDetail>;

/** @-mention chips sent with a message. IDs are checked against the workspace on the server. */
export const contextRef = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("file"), fileId: z.uuid() }),
  z.object({ kind: z.literal("sheet-range"), fileId: z.uuid(), range: z.string().trim().min(1).max(64) }),
  z.object({ kind: z.literal("slide"), fileId: z.uuid(), slideIndex: z.number().int().nonnegative() }),
  z.object({ kind: z.literal("email"), messageId: z.string().trim().min(1).max(256) }),
]);
export type ContextRef = z.infer<typeof contextRef>;

export const sendMessageInput = z.object({
  text: z.string().trim().min(1, "Message is required").max(MESSAGE_TEXT_MAX),
  modelId: z.string().trim().min(1).max(128).optional(),
  mode: agentMode.optional(),
  context: z.array(contextRef).max(CONTEXT_REFS_MAX).optional(),
});
export type SendMessageInput = z.infer<typeof sendMessageInput>;

export const sendMessageResponse = z.object({ runId: z.uuid(), messageId: z.uuid() });

export const answerQuestionInput = z
  .object({
    optionLabel: z.string().trim().min(1).max(80).optional(),
    otherText: z.string().trim().min(1).max(2000).optional(),
  })
  .refine((v) => (v.optionLabel === undefined) !== (v.otherText === undefined), {
    message: "Give either optionLabel or otherText",
  });
export type AnswerQuestionInput = z.infer<typeof answerQuestionInput>;

export const runRef = z.object({ runId: z.uuid(), status: runStatus });
export type RunRef = z.infer<typeof runRef>;
