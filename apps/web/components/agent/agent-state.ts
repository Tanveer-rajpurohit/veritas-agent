import { TERMINAL_RUN_STATUSES, type AgentErrorCode, type AgentEventEnvelope, type RunStatus } from "@veritas/shared";

const ASK_USER_TOOL = "ask_user";

export type ToolStep = {
  toolCallId: string;
  toolName: string;
  label: string;
  input: unknown;
  status: "running" | "done" | "failed";
  output?: unknown;
};

export type PendingQuestion = {
  questionId: string;
  question: string;
  options: { label: string; description?: string }[];
  allowOther: boolean;
};

export type RunError = {
  code: AgentErrorCode;
  message: string;
  retryable: boolean;
};

/** Everything the panel shows about one run, folded from its event stream. */
export type RunView = {
  runId: string;
  /** Highest seq applied. Events at or below it are duplicates from a replay. */
  lastSeq: number;
  status: RunStatus;
  modelId: string | null;
  /** When the run first reported running. */
  startedAt: string | null;
  /** Answer text since the last point the server saved the assistant's messages. */
  text: string;
  reasoning: string;
  steps: ToolStep[];
  question: PendingQuestion | null;
  error: RunError | null;
};

export function initialRunView(runId: string): RunView {
  return {
    runId,
    lastSeq: 0,
    status: "queued",
    modelId: null,
    startedAt: null,
    text: "",
    reasoning: "",
    steps: [],
    question: null,
    error: null,
  };
}

export const isTerminal = (status: RunStatus) => TERMINAL_RUN_STATUSES.includes(status);

export function foldEnvelope(state: RunView, envelope: AgentEventEnvelope): RunView {
  if (envelope.runId !== state.runId || envelope.seq <= state.lastSeq) return state;
  const next: RunView = { ...state, lastSeq: envelope.seq };
  const event = envelope.event;

  switch (event.type) {
    case "reasoning-delta":
      return { ...next, reasoning: next.reasoning + event.text };
    case "text-delta":
      return { ...next, text: next.text + event.text };
    case "tool-call":
      // ask_user is shown as the question card, not as a step.
      if (event.toolName === ASK_USER_TOOL) return next;
      return {
        ...next,
        steps: [
          ...next.steps,
          {
            toolCallId: event.toolCallId,
            toolName: event.toolName,
            label: describeToolStep(event.toolName, event.input),
            input: event.input,
            status: "running",
          },
        ],
      };
    case "tool-result":
      return {
        ...next,
        steps: next.steps.map((s) =>
          s.toolCallId === event.toolCallId
            ? {
                ...s,
                status: event.isError ? "failed" : "done",
                output: event.output,
              }
            : s,
        ),
      };
    case "step-finish":
      return next;
    case "ask-user":
      return {
        ...next,
        question: {
          questionId: event.questionId,
          question: event.question,
          options: event.options,
          allowOther: event.allowOther,
        },
      };
    case "error":
      return {
        ...next,
        error: {
          code: event.code,
          message: event.message,
          retryable: event.retryable,
        },
      };
    case "run-status": {
      const withStatus: RunView = {
        ...next,
        status: event.status,
        modelId: event.modelId,
        startedAt: next.startedAt ?? event.at,
      };
      // The server saves the assistant's messages when it pauses for a question,
      // so the panel shows them from the thread and the live text starts over.
      if (event.status === "awaiting_answer") return { ...withStatus, text: "", reasoning: "" };
      if (event.status === "running") return { ...withStatus, question: null, error: null };
      return withStatus;
    }
  }
}

/** The SSE URL for a run, resuming after the last applied event. */
export function runEventsUrl(workspaceId: string, runId: string, afterSeq: number): string {
  const base = `/api/v1/workspaces/${workspaceId}/agent/runs/${runId}/events`;
  return afterSeq > 0 ? `${base}?after=${afterSeq}` : base;
}

const RECONNECT_BASE_MS = 500;
const RECONNECT_MAX_MS = 10_000;

/** Backoff before reopening a stream the browser gave up on. */
export const reconnectDelayMs = (attempt: number) => Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** attempt);

/** Plain words for a tool call, shown as one step line. */
export function describeToolStep(toolName: string, input: unknown): string {
  const args = isRecord(input) ? input : {};
  const name = typeof args.name === "string" ? args.name : typeof args.fileName === "string" ? args.fileName : null;
  switch (toolName) {
    case "list_workspace_files":
      return typeof args.query === "string" ? `Looking for files named "${args.query}"` : "Listing workspace files";
    case "read_file":
      return name ? `Reading ${name}` : "Reading a file";
    case "search_workspace":
      return typeof args.query === "string" ? `Searching the workspace for "${args.query}"` : "Searching the workspace";
    default: {
      const words = toolName.replace(/[_.-]+/g, " ").trim();
      return words ? `Using ${words}` : "Using a tool";
    }
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** "12s", "1m 05s", "1h 02m". */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  return `${seconds}s`;
}

type FormatOptions = { now?: Date; locale?: string; timeZone?: string };

/**
 * F060 provenance line. `short` is "Gemini 3.1 Pro · 14:02" today and adds the
 * date on older messages; `full` is the exact time and duration for the tooltip.
 */
export function formatProvenance(
  modelName: string,
  provenance: { startedAt: string; finishedAt: string },
  { now = new Date(), locale, timeZone }: FormatOptions = {},
): { short: string; full: string } {
  const finished = new Date(provenance.finishedAt);
  const dayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const isToday = dayKey.format(finished) === dayKey.format(now);
  const isThisYear =
    new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric" }).format(finished) ===
    new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric" }).format(now);

  const time = new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(finished);
  const date = new Intl.DateTimeFormat(locale, {
    timeZone,
    day: "numeric",
    month: "short",
    year: isThisYear ? undefined : "numeric",
  }).format(finished);
  const fullTime = new Intl.DateTimeFormat(locale, {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(finished);
  const took = formatElapsed(finished.getTime() - new Date(provenance.startedAt).getTime());

  return {
    short: `${modelName} · ${isToday ? time : `${date}, ${time}`}`,
    full: `Written by ${modelName} on ${fullTime}. Took ${took}.`,
  };
}

/** Text parts of a stored AI SDK message. */
export function textOfParts(parts: unknown[]): string[] {
  return parts.flatMap((p) => (isRecord(p) && p.type === "text" && typeof p.text === "string" ? [p.text] : []));
}

/** Tool calls in a stored assistant message, as step labels. ask_user is left out. */
export function toolStepsOfParts(parts: unknown[]): string[] {
  return parts.flatMap((p) =>
    isRecord(p) && p.type === "tool-call" && typeof p.toolName === "string" && p.toolName !== ASK_USER_TOOL ? [describeToolStep(p.toolName, p.input)] : [],
  );
}
