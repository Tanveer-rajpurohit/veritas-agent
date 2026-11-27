"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { AgentMessage, AgentMode, AnswerQuestionInput, ModelList, RunRef, ThreadDetail, ThreadSummary } from "@veritas/shared";
import { Button, cx, Orb, PlusIcon, type OrbTone } from "@veritas/ui";
import { apiFetch, type ApiResult } from "@/lib/api-client";
import { takeAgentPrompt, useAgentContext, useQueuedAgentPrompt } from "./agent-context";
import { formatElapsed, formatProvenance, isTerminal, textOfParts, toolStepsOfParts, type RunError, type RunView, type ToolStep } from "./agent-state";
import { Composer, type ModelsState } from "./composer";
import { Markdown } from "./markdown";
import { QuestionCard } from "./question-card";
import { useRunView } from "./use-run-view";

const MODEL_STORAGE_KEY = "veritas.agent.model";
const threadStorageKey = (workspaceId: string) => `veritas.agent.thread.${workspaceId}`;
const NEW_THREAD_TITLE = "New chat";

const MODE_TONES: Record<AgentMode, OrbTone> = {
  general: "lagoon",
  legal: "ember",
  analyst: "moss",
  presenter: "coral",
  researcher: "glacier",
};

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage can be blocked (private mode, quotas). Remembering is a convenience only.
  }
}

type Notice = { kind: "rate-limited"; until: number } | { kind: "provider-down"; retryText: string } | { kind: "message"; text: string };

type PendingMessage = { text: string; chipLabels: string[] };

/** The agent side panel: thread header, conversation, live run, question cards and the composer. Fills its parent's height. */
export function AgentPanel({ workspaceId }: { workspaceId: string }) {
  const [models, setModels] = useState<ModelsState>({ status: "loading" });
  const [modelId, setModelId] = useState<string | null>(null);
  const [mode, setMode] = useState<AgentMode>("general");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ThreadDetail | null>(null);
  const [isLoadingThread, setIsLoadingThread] = useState(true);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingMessage | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [finishedError, setFinishedError] = useState<RunError | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [answer, setAnswer] = useState<{
    isSubmitting: boolean;
    error: string | null;
  }>({ isSubmitting: false, error: null });
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const { chips, clear: clearChips } = useAgentContext();

  const applyModels = useCallback((result: ApiResult<ModelList>) => {
    if (!result.ok) {
      setModels({ status: "error", message: result.error.error });
      return;
    }
    const list = result.data.models;
    setModels({ status: "ready", models: list });
    const stored = readStorage(MODEL_STORAGE_KEY);
    setModelId((list.find((m) => m.id === stored) ?? list.find((m) => m.isDefault) ?? list[0])?.id ?? null);
  }, []);

  /** Loads a thread and reattaches to its run if one is still open. Returns false when the thread is gone. */
  const loadThread = useCallback(
    async (id: string): Promise<boolean> => {
      const result = await apiFetch<ThreadDetail>(`/api/v1/workspaces/${workspaceId}/agent/threads/${id}`);
      if (!result.ok) return false;
      setDetail(result.data);
      setPending(null);
      setMode(result.data.thread.mode);
      const run = result.data.latestRun;
      setActiveRunId(run && !isTerminal(run.status) ? run.id : null);
      return true;
    },
    [workspaceId],
  );

  const selectThread = useCallback(
    (id: string | null) => {
      setThreadId(id);
      writeStorage(threadStorageKey(workspaceId), id);
      setNotice(null);
      setFinishedError(null);
      if (id === null) {
        setDetail(null);
        setPending(null);
        setActiveRunId(null);
      }
    },
    [workspaceId],
  );

  useEffect(() => {
    let isCancelled = false;
    void apiFetch<ModelList>("/api/v1/models").then((result) => {
      if (!isCancelled) applyModels(result);
    });
    return () => {
      isCancelled = true;
    };
  }, [applyModels]);

  // Reopen the thread the user had last, or their newest one.
  useEffect(() => {
    let isCancelled = false;
    void (async () => {
      const stored = readStorage(threadStorageKey(workspaceId));
      if (stored && (await loadThread(stored))) {
        if (!isCancelled) setThreadId(stored);
      } else {
        const list = await apiFetch<{ threads: ThreadSummary[] }>(`/api/v1/workspaces/${workspaceId}/agent/threads`);
        const newest = list.ok ? list.data.threads[0] : undefined;
        if (!isCancelled && newest && (await loadThread(newest.id))) selectThread(newest.id);
      }
      if (!isCancelled) setIsLoadingThread(false);
    })();
    return () => {
      isCancelled = true;
    };
  }, [workspaceId, loadThread, selectThread]);

  // The server saves messages when a run pauses or ends; reload so they show with provenance.
  const { view, isDisconnected, reconnect } = useRunView(workspaceId, activeRunId, (status, error) => {
    if (!threadId) return;
    if (status === "awaiting_answer") void loadThread(threadId);
    if (isTerminal(status)) {
      setFinishedError(error);
      void loadThread(threadId);
    }
  });

  const isRunning = activeRunId !== null;

  const send = async (text: string): Promise<boolean> => {
    setIsSending(true);
    setNotice(null);
    setFinishedError(null);
    try {
      let id = threadId;
      if (!id) {
        const created = await apiFetch<ThreadSummary>(`/api/v1/workspaces/${workspaceId}/agent/threads`, { method: "POST", body: { mode } });
        if (!created.ok) {
          setNotice({ kind: "message", text: created.error.error });
          return false;
        }
        id = created.data.id;
        selectThread(id);
        setDetail({ thread: created.data, messages: [], latestRun: null });
      }

      const result = await apiFetch<{ runId: string; messageId: string }>(`/api/v1/workspaces/${workspaceId}/agent/threads/${id}/messages`, {
        method: "POST",
        body: {
          text,
          modelId: modelId ?? undefined,
          mode,
          context: chips.length > 0 ? chips.map((c) => c.ref) : undefined,
        },
      });
      if (!result.ok) {
        if (result.status === 429)
          setNotice({
            kind: "rate-limited",
            until: Date.now() + (result.retryAfterSeconds ?? 30) * 1000,
          });
        else if (result.status === 503) setNotice({ kind: "provider-down", retryText: text });
        else setNotice({ kind: "message", text: result.error.error });
        return false;
      }
      setLastPrompt(text);
      setPending({ text, chipLabels: chips.map((c) => c.label) });
      clearChips();
      setActiveRunId(result.data.runId);
      return true;
    } finally {
      setIsSending(false);
    }
  };

  // Prompts from the prompt window wait until the panel can send (models loaded, no run open).
  const queuedPrompt = useQueuedAgentPrompt();
  const canTakePrompt = models.status === "ready" && !isLoadingThread && !isRunning && !isSending;
  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  });
  useEffect(() => {
    if (!queuedPrompt || !canTakePrompt) return;
    const prompt = takeAgentPrompt();
    if (prompt) void sendRef.current(prompt.text);
  }, [queuedPrompt, canTakePrompt]);

  const stop = async () => {
    if (!activeRunId) return;
    setIsStopping(true);
    const result = await apiFetch<RunRef>(`/api/v1/workspaces/${workspaceId}/agent/runs/${activeRunId}/stop`, { method: "POST" });
    setIsStopping(false);
    if (!result.ok) setNotice({ kind: "message", text: result.error.error });
  };

  const submitAnswer = async (questionId: string, body: AnswerQuestionInput) => {
    setAnswer({ isSubmitting: true, error: null });
    const result = await apiFetch<RunRef>(`/api/v1/workspaces/${workspaceId}/agent/questions/${questionId}/answer`, { method: "POST", body });
    setAnswer({
      isSubmitting: false,
      error: result.ok ? null : result.error.error,
    });
  };

  const chooseModel = (id: string) => {
    setModelId(id);
    writeStorage(MODEL_STORAGE_KEY, id);
  };

  const modelName = (id: string) => (models.status === "ready" ? models.models.find((m) => m.id === id)?.displayName : undefined) ?? id;
  const clearNotice = useCallback(() => setNotice(null), []);
  const blockedReason = useBlockedReason(notice, clearNotice);
  const title = detail?.thread.title ?? NEW_THREAD_TITLE;
  const question = view?.question ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface text-ink">
      <PanelHeader
        workspaceId={workspaceId}
        title={title}
        tone={MODE_TONES[mode]}
        currentThreadId={threadId}
        onSelect={(id) => {
          selectThread(id);
          void loadThread(id);
        }}
        onNew={() => selectThread(null)}
      />

      <Conversation
        isLoading={isLoadingThread}
        messages={detail?.messages ?? []}
        pending={pending}
        view={view}
        modelName={modelName}
        tone={MODE_TONES[mode]}
        question={
          question ? (
            <QuestionCard
              key={question.questionId}
              question={question}
              isSubmitting={answer.isSubmitting}
              error={answer.error}
              onAnswer={(body) => void submitAnswer(question.questionId, body)}
              onSkip={() => void stop()}
            />
          ) : null
        }
        footer={
          <>
            {isDisconnected ? (
              <Callout tone="neutral" action={{ label: "Reconnect", onClick: reconnect }}>
                Lost the connection to this run. It may still be working.
              </Callout>
            ) : null}
            {view?.error && !isTerminal(view.status) ? <Callout tone="danger">{view.error.message}</Callout> : null}
            {finishedError ? (
              <Callout
                tone="danger"
                action={
                  finishedError.retryable && lastPrompt
                    ? {
                        label: "Try again",
                        onClick: () => void send(lastPrompt),
                      }
                    : undefined
                }
              >
                {finishedError.message}
              </Callout>
            ) : null}
            {notice?.kind === "provider-down" ? (
              <Callout
                tone="neutral"
                action={{
                  label: "Retry",
                  onClick: () => void send(notice.retryText),
                }}
              >
                Veritas can&apos;t reach the model provider right now. Your message wasn&apos;t sent.
              </Callout>
            ) : null}
            {notice?.kind === "message" ? <Callout tone="neutral">{notice.text}</Callout> : null}
          </>
        }
      />

      <Composer
        isRunning={isRunning}
        blockedReason={blockedReason}
        isSending={isSending}
        isStopping={isStopping}
        onSend={send}
        onStop={() => void stop()}
        models={models}
        modelId={modelId}
        onModelChange={chooseModel}
        onRetryModels={() => {
          setModels({ status: "loading" });
          void apiFetch<ModelList>("/api/v1/models").then(applyModels);
        }}
        mode={mode}
        onModeChange={setMode}
      />
    </div>
  );
}

/** Live countdown text while rate limited; clears the notice when the wait is over. */
function useBlockedReason(notice: Notice | null, onExpire: () => void): string | null {
  const [now, setNow] = useState(() => Date.now());
  const until = notice?.kind === "rate-limited" ? notice.until : null;
  useEffect(() => {
    if (until === null) return;
    const timer = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= until) onExpire();
    }, 1000);
    return () => clearInterval(timer);
  }, [until, onExpire]);
  if (until === null) return null;
  const seconds = Math.max(1, Math.ceil((until - now) / 1000));
  return `Too many requests in a short time. You can send again in ${seconds}s.`;
}

function PanelHeader({
  workspaceId,
  title,
  tone,
  currentThreadId,
  onSelect,
  onNew,
}: {
  workspaceId: string;
  title: string;
  tone: OrbTone;
  currentThreadId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [threads, setThreads] = useState<{ status: "loading" } | { status: "ready"; threads: ThreadSummary[] } | { status: "error"; message: string }>({
    status: "loading",
  });

  const openHistory = async (button: HTMLButtonElement) => {
    const popover = popoverRef.current;
    if (!popover) return;
    const rect = button.getBoundingClientRect();
    popover.style.top = `${rect.bottom + 4}px`;
    popover.style.right = `${window.innerWidth - rect.right}px`;
    popover.showPopover();
    setThreads({ status: "loading" });
    const result = await apiFetch<{ threads: ThreadSummary[] }>(`/api/v1/workspaces/${workspaceId}/agent/threads`);
    setThreads(result.ok ? { status: "ready", threads: result.data.threads } : { status: "error", message: result.error.error });
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line pr-1 pl-4">
      <Orb size={20} tone={tone} />
      <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</h2>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={(e) => void openHistory(e.currentTarget)}
        className="h-11 shrink-0 rounded-lg px-3 text-sm font-medium text-ink-muted transition-colors duration-150 hover:bg-surface-hover hover:text-ink"
      >
        History
      </button>
      <button
        type="button"
        aria-label="New chat"
        onClick={onNew}
        className="flex size-11 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors duration-150 hover:bg-surface-hover hover:text-ink"
      >
        <PlusIcon className="size-4" />
      </button>

      <div
        ref={popoverRef}
        popover="auto"
        role="dialog"
        aria-label="Chat history"
        className="fixed inset-auto m-0 max-h-96 w-72 overflow-y-auto rounded-xl border border-line bg-surface-raised p-2 text-ink shadow-overlay"
      >
        {threads.status === "loading" ? <p className="px-2 py-2 text-sm text-ink-muted">Loading chats</p> : null}
        {threads.status === "error" ? <p className="px-2 py-2 text-sm text-ink-muted">{threads.message}</p> : null}
        {threads.status === "ready" && threads.threads.length === 0 ? <p className="px-2 py-2 text-sm text-ink-muted">No chats yet.</p> : null}
        {threads.status === "ready" ? (
          <ul className="flex flex-col">
            {threads.threads.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  aria-current={t.id === currentThreadId ? "true" : undefined}
                  onClick={() => {
                    popoverRef.current?.hidePopover();
                    onSelect(t.id);
                  }}
                  className={cx(
                    "flex min-h-11 w-full flex-col justify-center rounded-lg px-2 py-1 text-left transition-colors duration-150",
                    t.id === currentThreadId ? "bg-surface-selected" : "hover:bg-surface-hover",
                  )}
                >
                  <span className="truncate text-sm font-medium">{t.title}</span>
                  <time dateTime={t.updatedAt} className="text-xs text-ink-muted tabular-nums">
                    {new Date(t.updatedAt).toLocaleString(undefined, {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </header>
  );
}

const NEAR_BOTTOM_PX = 48;

function Conversation({
  isLoading,
  messages,
  pending,
  view,
  modelName,
  tone,
  question,
  footer,
}: {
  isLoading: boolean;
  messages: AgentMessage[];
  pending: PendingMessage | null;
  view: RunView | null;
  modelName: (id: string) => string;
  tone: OrbTone;
  question: ReactNode;
  footer: ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isPinnedRef = useRef(true);
  const isEmpty = !isLoading && messages.length === 0 && !pending && !view;

  // Follow new content only while the reader is at the bottom.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && isPinnedRef.current) el.scrollTop = el.scrollHeight;
  });

  return (
    <section
      ref={scrollRef}
      aria-label="Conversation"
      aria-busy={isLoading || undefined}
      onScroll={(e) => {
        const el = e.currentTarget;
        isPinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
      }}
      className="min-h-0 flex-1 overflow-y-auto"
    >
      {isLoading ? (
        <div className="flex flex-col gap-4 px-4 py-6" aria-hidden>
          <div className="ml-auto h-10 w-2/3 rounded-xl bg-surface-muted" />
          <div className="h-4 w-full rounded-sm bg-surface-muted" />
          <div className="h-4 w-4/5 rounded-sm bg-surface-muted" />
        </div>
      ) : null}

      {isEmpty ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
          <Orb size={48} tone={tone} />
          <p className="text-base font-semibold">Ask Veritas about your workspace</p>
          <p className="max-w-xs text-sm text-ink-muted">
            It can look through your files and will ask you when something is unclear. Type @ to point it at a file, range, slide or email.
          </p>
        </div>
      ) : null}

      <ol className="flex flex-col gap-6 px-4 py-4">
        {messages.map((m) => (
          <StoredMessage key={m.id} message={m} modelName={modelName} />
        ))}
        {pending ? <UserBubble text={pending.text} chipLabels={pending.chipLabels} /> : null}
        {view ? <LiveRun view={view} tone={tone} /> : null}
        {question ? (
          <li aria-live="polite" aria-label="Question from Veritas">
            {question}
          </li>
        ) : null}
      </ol>
      <div className="flex flex-col gap-3 px-4 pb-4 empty:hidden">{footer}</div>
      <RunAnnouncer status={view?.status ?? null} />
    </section>
  );
}

function UserBubble({ text, chipLabels = [] }: { text: string; chipLabels?: string[] }) {
  return (
    <li className="flex flex-col items-end gap-1">
      <p className="max-w-[85%] rounded-xl bg-surface-selected px-3 py-2 text-sm leading-6 break-words whitespace-pre-wrap">{text}</p>
      {chipLabels.length > 0 ? <p className="max-w-[85%] truncate font-mono text-xs text-ink-muted">With {chipLabels.join(", ")}</p> : null}
    </li>
  );
}

function StoredMessage({ message, modelName }: { message: AgentMessage; modelName: (id: string) => string }) {
  if (message.role === "tool") return null;
  const texts = textOfParts(message.parts);
  // The first text part is what the user typed; a second one is the server's note about attached context.
  if (message.role === "user") return texts[0] ? <UserBubble text={texts[0]} /> : null;

  const steps = toolStepsOfParts(message.parts);
  const text = texts.join("\n\n").trim();
  return (
    <li className="flex flex-col gap-2">
      {steps.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {steps.map((label, i) => (
            <li key={i} className="text-xs text-ink-muted">
              {label}
            </li>
          ))}
        </ul>
      ) : null}
      {text ? <Markdown text={text} /> : null}
      {text && message.provenance ? <ProvenanceLine modelName={modelName(message.provenance.modelId)} provenance={message.provenance} /> : null}
    </li>
  );
}

function ProvenanceLine({ modelName, provenance }: { modelName: string; provenance: { startedAt: string; finishedAt: string } }) {
  const { short, full } = formatProvenance(modelName, provenance);
  return (
    <p className="text-xs text-ink-subtle tabular-nums">
      <time dateTime={provenance.finishedAt} title={full}>
        <span className="sr-only">{full}</span>
        <span aria-hidden>{short}</span>
      </time>
    </p>
  );
}

function LiveRun({ view, tone }: { view: RunView; tone: OrbTone }) {
  const isWorking = view.status === "queued" || view.status === "running";
  if (!isWorking && !view.text && view.steps.length === 0) return null;
  return (
    <li className="flex flex-col gap-3">
      {isWorking ? <WorkingLine startedAt={view.startedAt} tone={tone} /> : null}
      {view.reasoning ? (
        <details className="group text-xs text-ink-muted">
          <summary className="flex min-h-11 cursor-pointer items-center rounded-lg px-2 transition-colors duration-150 hover:bg-surface-hover">
            Thinking
          </summary>
          <p className="px-2 pt-1 leading-5 whitespace-pre-wrap">{view.reasoning}</p>
        </details>
      ) : null}
      {view.steps.length > 0 ? <StepList steps={view.steps} /> : null}
      {view.text ? <Markdown text={view.text} /> : null}
    </li>
  );
}

function WorkingLine({ startedAt, tone }: { startedAt: string | null; tone: OrbTone }) {
  const [fallbackStart] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const start = startedAt ? Date.parse(startedAt) : fallbackStart;
  return (
    <p className="flex items-center gap-2 text-sm text-ink-muted">
      <Orb size={20} tone={tone} state="thinking" />
      <span className="tabular-nums">Working for {formatElapsed(now - start)}</span>
    </p>
  );
}

function StepList({ steps }: { steps: ToolStep[] }) {
  return (
    <details open className="rounded-lg border border-line">
      <summary className="flex min-h-11 cursor-pointer items-center px-3 text-xs font-medium text-ink-muted transition-colors duration-150 hover:bg-surface-hover">
        {steps.length === 1 ? "1 step" : `${steps.length} steps`}
      </summary>
      <ol className="flex flex-col border-t border-line">
        {steps.map((step) => (
          <li key={step.toolCallId}>
            <details>
              <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-3 text-sm transition-colors duration-150 hover:bg-surface-hover">
                <span className="min-w-0 flex-1 truncate">{step.label}</span>
                <span className={cx("shrink-0 text-xs", step.status === "failed" ? "text-danger" : "text-ink-subtle")}>
                  {step.status === "running" ? "Working" : step.status === "failed" ? "Failed" : "Done"}
                </span>
              </summary>
              <div className="flex flex-col gap-2 px-3 pb-3">
                <JsonBlock label="Input" value={step.input} />
                {step.status !== "running" ? <JsonBlock label="Result" value={step.output} /> : null}
              </div>
            </details>
          </li>
        ))}
      </ol>
    </details>
  );
}

const JSON_PREVIEW_MAX = 4000;

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  let text: string;
  try {
    text = JSON.stringify(value, null, 2) ?? "";
  } catch {
    text = String(value);
  }
  if (text.length > JSON_PREVIEW_MAX) text = `${text.slice(0, JSON_PREVIEW_MAX)}\n…`;
  return (
    <div className="flex flex-col gap-1">
      <p className="font-mono text-xs tracking-wide text-ink-muted uppercase">{label}</p>
      <pre className="max-h-48 overflow-auto rounded-md bg-surface-muted p-2 font-mono text-xs leading-5">{text}</pre>
    </div>
  );
}

function Callout({ tone, action, children }: { tone: "neutral" | "danger"; action?: { label: string; onClick: () => void }; children: ReactNode }) {
  return (
    <div
      role="status"
      className={cx(
        "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm",
        tone === "danger" ? "border-danger/30 bg-danger-soft text-ink" : "border-line bg-surface-muted text-ink",
      )}
    >
      <p className="min-w-0 flex-1">{children}</p>
      {action ? (
        <Button variant="secondary" size="sm" className="h-11 shrink-0" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}

const STATUS_ANNOUNCEMENTS: Partial<Record<RunView["status"], string>> = {
  running: "Veritas is working.",
  awaiting_answer: "Veritas has a question for you.",
  awaiting_approval: "Veritas is waiting for your approval.",
  completed: "Veritas finished.",
  failed: "The run stopped with an error.",
  cancelled: "The run was stopped.",
};

/** Announces run status changes once, instead of every streamed token. */
function RunAnnouncer({ status }: { status: RunView["status"] | null }) {
  return (
    <p className="sr-only" aria-live="polite">
      {status ? (STATUS_ANNOUNCEMENTS[status] ?? "") : ""}
    </p>
  );
}
