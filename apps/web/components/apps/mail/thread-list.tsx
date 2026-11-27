"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { MailThreadList, MailThreadSummary } from "@veritas/shared";
import { cx } from "@veritas/ui";
import { apiFetch, type ApiResult } from "@/lib/api-client";
import { InlineError } from "../inline-error";
import { formatFullDate, formatRelativeTime, senderLabel } from "./mail-format";
import { SenderAvatar } from "./sender-avatar";

type Props = {
  workspaceId: string;
  selectedId: string | null;
  onSelect: (threadId: string) => void;
  /** The API said the Google connection is missing or lacks a scope (409). */
  onConnectionLost: () => void;
};

type ListState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; threads: MailThreadSummary[]; nextPageToken: string | null };

function fetchThreads(workspaceId: string, q: string, pageToken?: string): Promise<ApiResult<MailThreadList>> {
  const params = new URLSearchParams({ label: "INBOX" });
  if (q) params.set("q", q);
  if (pageToken) params.set("pageToken", pageToken);
  return apiFetch<MailThreadList>(`/api/v1/workspaces/${workspaceId}/mail/threads?${params}`);
}

export function ThreadList({ workspaceId, selectedId, onSelect, onConnectionLost }: Props) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<ListState>({ status: "loading" });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState("");
  /** Only the newest request may write results, so a slow old search can't overwrite a newer one. */
  const requestId = useRef(0);
  const searchId = useId();

  const applyFirstPage = (id: number, result: ApiResult<MailThreadList>) => {
    if (id !== requestId.current) return;
    if (result.ok) setState({ status: "ready", ...result.data });
    else if (result.status === 409) onConnectionLost();
    else setState({ status: "error", message: result.error.error });
  };

  useEffect(() => {
    const id = ++requestId.current;
    void fetchThreads(workspaceId, "").then((result) => applyFirstPage(id, result));
    // Runs once per workspace; searches and retries start from event handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const load = async (q: string) => {
    const id = ++requestId.current;
    setState({ status: "loading" });
    setMoreError("");
    applyFirstPage(id, await fetchThreads(workspaceId, q));
  };

  const onSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = String(new FormData(event.currentTarget).get("q") ?? "").trim();
    setQuery(q);
    void load(q);
  };

  const loadMore = async () => {
    if (state.status !== "ready" || !state.nextPageToken) return;
    const id = requestId.current;
    setIsLoadingMore(true);
    setMoreError("");
    const result = await fetchThreads(workspaceId, query, state.nextPageToken);
    setIsLoadingMore(false);
    if (id !== requestId.current) return;
    if (result.ok) {
      setState((prev) =>
        prev.status === "ready"
          ? {
              status: "ready",
              // A thread that got a new message between pages can show up twice.
              threads: [...prev.threads, ...result.data.threads.filter((t) => !prev.threads.some((p) => p.id === t.id))],
              nextPageToken: result.data.nextPageToken,
            }
          : prev,
      );
    } else if (result.status === 409) onConnectionLost();
    else setMoreError(result.error.error);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <form role="search" onSubmit={onSearch} className="shrink-0 border-b border-line p-3">
        <label htmlFor={searchId} className="sr-only">
          Search mail
        </label>
        <input
          id={searchId}
          name="q"
          type="search"
          placeholder="Search mail"
          maxLength={500}
          className={cx(
            "h-11 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-subtle",
            "transition-[border-color,box-shadow] duration-150 ease-out-soft hover:border-ink-subtle",
            "focus-visible:border-ink focus-visible:ring-4 focus-visible:ring-focus/15 focus-visible:outline-none",
          )}
        />
      </form>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {state.status === "loading" ? (
          <ThreadSkeleton />
        ) : state.status === "error" ? (
          <div className="p-3">
            <InlineError message={state.message} onRetry={() => void load(query)} />
          </div>
        ) : state.threads.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-ink-muted">
            {query ? `Nothing in your inbox matches "${query}".` : "Your inbox is empty."}
          </p>
        ) : (
          <>
            <ul aria-label={query ? `Results for ${query}` : "Inbox"} className="divide-y divide-line">
              {state.threads.map((thread) => (
                <li key={thread.id}>
                  <ThreadRow thread={thread} isSelected={thread.id === selectedId} onSelect={onSelect} />
                </li>
              ))}
            </ul>
            {state.nextPageToken ? (
              <div className="flex flex-col gap-3 p-3">
                {moreError ? <InlineError message={moreError} /> : null}
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={isLoadingMore}
                  aria-busy={isLoadingMore || undefined}
                  className="h-11 rounded-lg text-sm font-semibold text-ink-muted transition-colors duration-150 hover:bg-surface-hover hover:text-ink disabled:cursor-not-allowed"
                >
                  {isLoadingMore ? "Loading…" : "Load more"}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function ThreadRow({
  thread,
  isSelected,
  onSelect,
}: {
  thread: MailThreadSummary;
  isSelected: boolean;
  onSelect: (threadId: string) => void;
}) {
  return (
    <button
      type="button"
      aria-current={isSelected ? "true" : undefined}
      onClick={() => onSelect(thread.id)}
      className={cx(
        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-150",        isSelected ? "bg-surface-selected" : "hover:bg-surface-hover",
      )}
    >
      <SenderAvatar address={thread.from} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-baseline gap-2">
          <span aria-hidden className={cx("size-2 shrink-0 self-center rounded-full", thread.isUnread ? "bg-focus" : "bg-transparent")} />
          {thread.isUnread ? <span className="sr-only">Unread.</span> : null}
          <span className={cx("min-w-0 flex-1 truncate text-sm", thread.isUnread ? "font-semibold text-ink" : "text-ink-muted")}>
            {senderLabel(thread.from)}
            {thread.messageCount > 1 ? <span className="ml-1 font-normal text-ink-subtle tabular-nums">{thread.messageCount}</span> : null}
          </span>
          <time dateTime={thread.lastMessageAt} title={formatFullDate(thread.lastMessageAt)} className="shrink-0 text-xs text-ink-subtle tabular-nums">
            {formatRelativeTime(thread.lastMessageAt)}
          </time>
        </span>
        <span className={cx("truncate pl-4 text-sm", thread.isUnread ? "font-semibold text-ink" : "text-ink")}>
          {thread.subject || "(no subject)"}
        </span>
        <span className="flex items-baseline gap-2 pl-4">
          <span className="min-w-0 flex-1 truncate text-sm text-ink-muted">{thread.snippet}</span>
          {thread.hasAttachments ? <span className="shrink-0 text-xs text-ink-subtle">Attachment</span> : null}
        </span>
      </span>
    </button>
  );
}

const SKELETON_ROWS = 8;

function ThreadSkeleton() {
  return (
    <div role="status" aria-label="Loading your inbox" className="divide-y divide-line">
      {Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <div key={i} aria-hidden className="flex flex-col gap-2 px-4 py-3">
          <div className="flex items-center gap-2 pl-4">
            <div className="h-3.5 w-32 animate-pulse rounded bg-surface-selected motion-reduce:animate-none" />
            <div className="ml-auto h-3 w-8 animate-pulse rounded bg-surface-hover motion-reduce:animate-none" />
          </div>
          <div className="ml-4 h-3.5 w-3/5 animate-pulse rounded bg-surface-selected motion-reduce:animate-none" />
          <div className="ml-4 h-3.5 w-4/5 animate-pulse rounded bg-surface-hover motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}
