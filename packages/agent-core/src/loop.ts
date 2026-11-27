import { askUserInput, type AgentEvent, type AgentMode, type AskUserInput, type TokenUsage } from "@veritas/shared";
import { isStepCount, streamText, type LanguageModel, type LanguageModelUsage, type ModelMessage, type AssistantModelMessage, type ToolModelMessage } from "ai";

/** What a model turn adds to history. */
export type ResponseMessage = AssistantModelMessage | ToolModelMessage;
import { toAgentError, type AgentErrorInfo } from "./errors";
import { buildInstructions, closeDanglingToolCalls, MODES, type PinnedAttachment } from "./prompt";
import { ASK_USER_TOOL, toToolSet, type ToolContext, type ToolDefinition } from "./tools";

/** Upper bound on model steps in one run segment, so a tool loop can't spin forever. */
export const MAX_STEPS_PER_RUN = 12;

export type RunTurnOptions = {
  model: LanguageModel;
  mode: AgentMode;
  pinned?: readonly PinnedAttachment[];
  /** Full thread history, ending with the new user message or the answer to ask_user. */
  history: readonly ModelMessage[];
  tools: readonly ToolDefinition[];
  context: ToolContext;
  /** Awaited per event, so the host can persist events in stream order. */
  emit: (event: AgentEvent) => Promise<void>;
  abortSignal: AbortSignal;
  maxSteps?: number;
};

export type PendingQuestion = { toolCallId: string; input: AskUserInput };

export type TurnOutcome = { messages: ResponseMessage[]; usage: TokenUsage } & (
  | { status: "completed"; hitStepLimit: boolean }
  | { status: "awaiting_answer"; question: PendingQuestion }
  | { status: "cancelled" }
  | { status: "failed"; error: AgentErrorInfo }
);

export const emptyUsage = (): TokenUsage => ({ inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, reasoningTokens: 0, totalTokens: 0 });

export function addUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cachedInputTokens: a.cachedInputTokens + b.cachedInputTokens,
    reasoningTokens: a.reasoningTokens + b.reasoningTokens,
    totalTokens: a.totalTokens + b.totalTokens,
  };
}

function fromSdkUsage(usage: LanguageModelUsage): TokenUsage {
  const input = usage.inputTokens ?? 0;
  const output = usage.outputTokens ?? 0;
  return {
    inputTokens: input,
    outputTokens: output,
    cachedInputTokens: usage.inputTokenDetails.cacheReadTokens ?? 0,
    reasoningTokens: usage.outputTokenDetails.reasoningTokens ?? 0,
    totalTokens: usage.totalTokens ?? input + output,
  };
}

/**
 * Runs the model until it answers, asks the user a question, hits the step
 * cap, fails or is stopped. Emits typed events as they stream and returns the
 * response messages for the host to persist.
 */
export async function runAgentTurn(options: RunTurnOptions): Promise<TurnOutcome> {
  const { emit, abortSignal } = options;
  const allowed = new Set(MODES[options.mode].tools);
  const toolSet = toToolSet(
    options.tools.filter((t) => allowed.has(t.name)),
    options.context,
  );

  const collected: ResponseMessage[] = [];
  let partialText = "";
  let usage = emptyUsage();
  let step = 0;
  let lastFinishReason = "";
  let pending: PendingQuestion | undefined;
  let failure: AgentErrorInfo | undefined;

  const result = streamText({
    model: options.model,
    instructions: buildInstructions(options.mode, options.pinned ?? []),
    messages: closeDanglingToolCalls(options.history),
    tools: toolSet,
    stopWhen: isStepCount(options.maxSteps ?? MAX_STEPS_PER_RUN),
    abortSignal,
    providerOptions: { google: { thinkingConfig: { includeThoughts: true } } },
    // Errors arrive as stream parts below. The default handler would print the
    // raw provider error, which can include the prompt.
    onError: () => {},
    onStepEnd: (stepResult) => {
      collected.push(...stepResult.response.messages);
      partialText = "";
    },
  });

  try {
    for await (const part of result.stream) {
      switch (part.type) {
        case "reasoning-delta":
          if (part.text) await emit({ type: "reasoning-delta", text: part.text });
          break;
        case "text-delta":
          if (!part.text) break;
          partialText += part.text;
          await emit({ type: "text-delta", text: part.text });
          break;
        case "tool-call":
          await emit({ type: "tool-call", toolCallId: part.toolCallId, toolName: part.toolName, input: part.input });
          if (part.toolName === ASK_USER_TOOL && !part.invalid) {
            const parsed = askUserInput.safeParse(part.input);
            if (parsed.success) pending ??= { toolCallId: part.toolCallId, input: parsed.data };
          }
          break;
        case "tool-result":
          await emit({ type: "tool-result", toolCallId: part.toolCallId, toolName: part.toolName, output: part.output, isError: false });
          break;
        case "tool-error":
          await emit({
            type: "tool-result",
            toolCallId: part.toolCallId,
            toolName: part.toolName,
            output: part.error instanceof Error ? part.error.message : "The tool failed.",
            isError: true,
          });
          break;
        case "finish-step": {
          const stepUsage = fromSdkUsage(part.usage);
          usage = addUsage(usage, stepUsage);
          lastFinishReason = part.finishReason;
          await emit({ type: "step-finish", step, finishReason: part.finishReason, usage: stepUsage });
          step += 1;
          break;
        }
        case "error":
          failure ??= toAgentError(part.error);
          break;
        default:
          break;
      }
    }
  } catch (error) {
    if (!abortSignal.aborted) failure ??= toAgentError(error);
  }

  if (abortSignal.aborted) {
    // Keep what the user already saw stream in, so history matches the screen.
    const messages: ResponseMessage[] = partialText ? [...collected, { role: "assistant", content: [{ type: "text", text: partialText }] }] : collected;
    return { status: "cancelled", messages, usage };
  }
  if (failure) return { status: "failed", error: failure, messages: collected, usage };
  if (pending) return { status: "awaiting_answer", question: pending, messages: collected, usage };
  return { status: "completed", hitStepLimit: lastFinishReason === "tool-calls", messages: collected, usage };
}
