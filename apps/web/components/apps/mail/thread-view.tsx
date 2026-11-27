"use client";

import { useEffect, useRef, useState } from "react";
import type { MailMessage, MailThread } from "@veritas/shared";
import { Button, cx } from "@veritas/ui";
import { apiFetch } from "@/lib/api-client";
import { ComposeForm } from "./compose-form";
import { InlineError } from "../inline-error";
import { formatAddress, formatFullDate, mailDocument, replySubject, senderLabel } from "./mail-format";
import { SenderAvatar } from "./sender-avatar";

type Props = {
  workspaceId: string;
  threadId: string;
  canSend: boolean;
  onBack: () => void;
  onConnectionLost: () => void;
};

type ThreadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; thread: MailThread };

/** Mount with `key={threadId}` so a new thread starts from a clean loading state. */
export function ThreadView({ workspaceId, threadId, canSend, onBack, onConnectionLost }: Props) {
  const [state, setState] = useState<ThreadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [replyTo, setReplyTo] = useState<MailMessage | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let isCurrent = true;
    void apiFetch<MailThread>(`/api/v1/workspaces/${workspaceId}/mail/threads/${encodeURIComponent(threadId)}`).then((result) => {
      if (!isCurrent) return;
      if (result.ok) setState({ status: "ready", thread: result.data });
      else if (result.status === 409) onConnectionLost();
      else setState({ status: "error", message: result.error.error });
    });
    return () => {
      isCurrent = false;
    };
  }, [workspaceId, threadId, attempt, onConnectionLost]);

  const reload = () => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-12 shrink-0 items-center gap-2 border-b border-line px-2 @2xl:px-4">
        <button
          type="button"
          onClick={onBack}
          className="h-11 shrink-0 rounded-lg px-3 text-sm font-medium text-ink-muted transition-colors duration-150 hover:bg-surface-hover hover:text-ink @2xl:hidden"
        >
          Back to inbox
        </button>
        <h2 className="min-w-0 flex-1 truncate py-2 text-base font-semibold">
          {state.status === "ready" ? state.thread.subject || "(no subject)" : null}
        </h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {state.status === "loading" ? (
          <MessageSkeleton />
        ) : state.status === "error" ? (
          <div className="p-4">
            <InlineError message={state.message} onRetry={reload} />
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-3 @2xl:p-4">
            {state.thread.messages.map((message, index) => (
              <MessageCard
                key={message.id}
                message={message}
                isInitiallyOpen={index === state.thread.messages.length - 1}
                onReply={() => {
                  setNotice("");
                  setReplyTo(message);
                }}
              />
            ))}
            {notice ? (
              <p role="status" className="rounded-lg bg-success-soft px-4 py-3 text-sm text-success">
                {notice}
              </p>
            ) : null}
            {replyTo ? (
              <ComposeForm
                key={replyTo.id}
                workspaceId={workspaceId}
                title={`Reply to ${senderLabel(replyTo.from)}`}
                initialDraft={{ to: replyTo.from.email, cc: "", subject: replySubject(replyTo.subject || state.thread.subject), text: "" }}
                reply={{ inReplyToMessageId: replyTo.id, threadId: state.thread.id }}
                canSend={canSend}
                onCancel={() => setReplyTo(null)}
                onSent={() => {
                  setReplyTo(null);
                  setNotice("Reply sent.");
                  setAttempt((n) => n + 1);
                }}
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function MessageCard({ message, isInitiallyOpen, onReply }: { message: MailMessage; isInitiallyOpen: boolean; onReply: () => void }) {
  const [isOpen, setIsOpen] = useState(isInitiallyOpen);

  return (
    <article aria-label={`Message from ${senderLabel(message.from)}`} className="rounded-xl border border-line bg-surface">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={cx(
          "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-surface-hover",
          isOpen ? "rounded-t-xl" : "rounded-xl",
        )}
      >
        <SenderAvatar address={message.from} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{senderLabel(message.from)}</span>
            <time dateTime={message.sentAt} className="shrink-0 text-xs text-ink-subtle tabular-nums">
              {formatFullDate(message.sentAt)}
            </time>
          </span>
          {isOpen ? null : <span className="truncate text-sm text-ink-muted">{message.text?.slice(0, 200) ?? ""}</span>}
        </span>
      </button>

      {isOpen ? (
        <div className="flex flex-col gap-3 px-4 pb-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-ink-muted">From</dt>
            <dd className="min-w-0 break-words">{formatAddress(message.from)}</dd>
            {message.to.length > 0 ? (
              <>
                <dt className="text-ink-muted">To</dt>
                <dd className="min-w-0 break-words">{message.to.map(formatAddress).join(", ")}</dd>
              </>
            ) : null}
            {message.cc.length > 0 ? (
              <>
                <dt className="text-ink-muted">Cc</dt>
                <dd className="min-w-0 break-words">{message.cc.map(formatAddress).join(", ")}</dd>
              </>
            ) : null}
          </dl>

          {message.hasBlockedImages ? (
            <p className="text-xs text-ink-muted">Some images in this message couldn&apos;t be loaded safely, so they&apos;re hidden.</p>
          ) : null}

          <MessageBody message={message} />

          {message.attachments.length > 0 ? (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium text-ink-muted">Attachments</p>
              <ul className="flex flex-wrap gap-2">
                {message.attachments.map((file) => (
                  <li key={file.id} className="rounded-md border border-line px-2 py-1 text-xs">
                    {file.filename || "Untitled file"}{" "}
                    <span className="text-ink-subtle tabular-nums">{formatSize(file.size)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <Button variant="secondary" size="lg" onClick={onReply}>
              Reply
            </Button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function MessageBody({ message }: { message: MailMessage }) {
  if (message.html) return <MailFrame title={`Message from ${senderLabel(message.from)}`} html={message.html} />;
  if (message.text) return <p className="text-sm break-words whitespace-pre-wrap">{message.text}</p>;
  return <p className="text-sm text-ink-muted">This message has no text to show.</p>;
}

/** Height before the document is measured: enough for a short message without a jump. */
const FRAME_INITIAL_HEIGHT = 160;

/**
 * Renders mail HTML in a frame sized to its content, so the reading pane is
 * the only vertical scroller. The sandbox has no allow-scripts: same-origin
 * lets us measure the document and load images from our own proxy, popups let
 * links open in a new tab, and nothing in the email can run code. Never add
 * allow-scripts next to allow-same-origin; together they let the frame remove
 * its own sandbox.
 */
function MailFrame({ title, html }: { title: string; html: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(FRAME_INITIAL_HEIGHT);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => cleanupRef.current?.(), []);

  const onLoad = () => {
    cleanupRef.current?.();
    const doc = frameRef.current?.contentDocument;
    const win = frameRef.current?.contentWindow;
    if (!doc?.body || !win) return;

    const measure = () => {
      // Add the horizontal scrollbar's height (zero when the email fits) so it never clips the last line.
      const scrollbar = win.innerHeight - doc.documentElement.clientHeight;
      setHeight(Math.ceil(doc.body.scrollHeight + Math.max(0, scrollbar)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(doc.body);
    const images = Array.from(doc.images);
    for (const image of images) image.addEventListener("load", measure);
    cleanupRef.current = () => {
      observer.disconnect();
      for (const image of images) image.removeEventListener("load", measure);
    };
  };

  return (
    <iframe
      ref={frameRef}
      title={title}
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      srcDoc={mailDocument(html)}
      referrerPolicy="no-referrer"
      onLoad={onLoad}
      style={{ height }}
      className="block w-full max-w-full rounded-lg border border-line bg-white"
    />
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function MessageSkeleton() {
  return (
    <div role="status" aria-label="Loading conversation" className="flex flex-col gap-4 p-4">
      <div aria-hidden className="flex flex-col gap-3 rounded-xl border border-line p-4">
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-36 animate-pulse rounded bg-surface-selected motion-reduce:animate-none" />
          <div className="ml-auto h-3 w-24 animate-pulse rounded bg-surface-hover motion-reduce:animate-none" />
        </div>
        <div className="h-3.5 w-1/2 animate-pulse rounded bg-surface-hover motion-reduce:animate-none" />
        <div className="h-48 animate-pulse rounded-lg bg-surface-hover motion-reduce:animate-none" />
      </div>
    </div>
  );
}
