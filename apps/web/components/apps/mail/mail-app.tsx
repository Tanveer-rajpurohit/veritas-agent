"use client";

import { useCallback, useState, type ReactNode } from "react";
import type { GoogleFeature } from "@veritas/shared";
import { Button, cx, MailIcon } from "@veritas/ui";
import { useDesktop } from "@/components/desktop/desktop-provider";
import { useGoogleConnection } from "@/hooks/connectors/use-google-connection";
import { GMAIL_SEND_SCOPE, startGoogleConnect } from "@/lib/google-connector";
import { ComposeForm } from "./compose-form";
import { InlineError } from "../inline-error";
import { ThreadList } from "./thread-list";
import { ThreadView } from "./thread-view";

export function MailApp() {
  const { workspaceId } = useDesktop();
  const { state, reload } = useGoogleConnection(workspaceId);
  const onConnectionLost = useCallback(() => void reload(), [reload]);

  if (state.status === "loading") {
    return (
      <MailFrame>
        <p role="status" className="px-6 py-12 text-center text-sm text-ink-muted">
          Checking your Google connection…
        </p>
      </MailFrame>
    );
  }
  if (state.status === "error") {
    return (
      <MailFrame>
        <div className="p-4">
          <InlineError message={state.message} onRetry={() => void reload()} />
        </div>
      </MailFrame>
    );
  }

  const { connection } = state;
  if (connection.kind === "not_connected") {
    return (
      <MailFrame>
        <ConnectPrompt
          title="Connect Gmail to see your mail here"
          body="Veritas reads your Gmail so it can show your inbox and search your messages. It only sends mail when you press Send, and you can disconnect any time in Settings."
          action="Connect Gmail"
          onConnect={() => startGoogleConnect(workspaceId, ["gmail"])}
        />
      </MailFrame>
    );
  }
  if (connection.kind === "needs_reconnect") {
    const features: GoogleFeature[] = connection.connector.scopes.includes(GMAIL_SEND_SCOPE) ? ["gmail", "gmail_send"] : ["gmail"];
    return (
      <MailFrame>
        <ConnectPrompt
          title="Reconnect Gmail"
          body={`Veritas can no longer read ${connection.connector.accountEmail ?? "your Gmail"}. Google access expires when it's revoked or the password changes. Connect again to bring your inbox back.`}
          action="Reconnect Gmail"
          onConnect={() => startGoogleConnect(workspaceId, features)}
        />
      </MailFrame>
    );
  }

  return (
    <MailClient
      workspaceId={workspaceId}
      accountEmail={connection.connector.accountEmail}
      canSend={connection.canSend}
      onConnectionLost={onConnectionLost}
    />
  );
}

function MailFrame({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="@container flex h-full min-h-64 flex-col">
      <div className="flex min-h-12 shrink-0 items-center gap-2 border-b border-line py-1 pr-2 pl-4">
        <MailIcon className="size-4 text-ink-muted" />
        <h1 className="text-sm font-semibold">Mail</h1>
        <div className="ml-auto flex min-w-0 items-center gap-2">{actions}</div>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

function ConnectPrompt({ title, body, action, onConnect }: { title: string; body: string; action: string; onConnect: () => void }) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  return (
    <div className="flex h-full items-center justify-center px-6 py-12">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-ink-muted">{body}</p>
        <Button
          size="lg"
          isLoading={isRedirecting}
          loadingLabel="Opening Google…"
          onClick={() => {
            setIsRedirecting(true);
            onConnect();
          }}
        >
          {action}
        </Button>
        <p className="text-xs text-ink-subtle">You'll pick an account on Google, then come back here.</p>
      </div>
    </div>
  );
}

type Pane = { kind: "thread"; threadId: string } | { kind: "compose" } | null;

function MailClient({
  workspaceId,
  accountEmail,
  canSend,
  onConnectionLost,
}: {
  workspaceId: string;
  accountEmail: string | null;
  canSend: boolean;
  onConnectionLost: () => void;
}) {
  const [pane, setPane] = useState<Pane>(null);
  const [notice, setNotice] = useState("");
  const closePane = useCallback(() => setPane(null), []);

  return (
    <MailFrame
      actions={
        <>
          {accountEmail ? <span className="hidden min-w-0 truncate text-xs text-ink-subtle @lg:inline">{accountEmail}</span> : null}
          <Button
            size="sm"
            className="min-h-11 @2xl:min-h-8"
            onClick={() => {
              setNotice("");
              setPane({ kind: "compose" });
            }}
          >
            New message
          </Button>
        </>
      }
    >
      <div className="flex h-full min-h-0">
        <div
          className={cx(
            "min-h-0 w-full flex-col @2xl:flex @2xl:w-80 @2xl:shrink-0 @2xl:border-r @2xl:border-line @4xl:w-96",
            pane ? "hidden" : "flex",
          )}
        >
          {notice ? (
            <p role="status" className="m-3 mb-0 rounded-lg bg-success-soft px-4 py-3 text-sm text-success">
              {notice}
            </p>
          ) : null}
          <ThreadList
            workspaceId={workspaceId}
            selectedId={pane?.kind === "thread" ? pane.threadId : null}
            onSelect={(threadId) => setPane({ kind: "thread", threadId })}
            onConnectionLost={onConnectionLost}
          />
        </div>

        <div className={cx("min-h-0 min-w-0 flex-1 flex-col @2xl:flex", pane ? "flex" : "hidden")}>
          {pane?.kind === "thread" ? (
            <ThreadView
              key={pane.threadId}
              workspaceId={workspaceId}
              threadId={pane.threadId}
              canSend={canSend}
              onBack={closePane}
              onConnectionLost={onConnectionLost}
            />
          ) : pane?.kind === "compose" ? (
            <div className="h-full overflow-y-auto p-3 @2xl:p-4">
              <ComposeForm
                workspaceId={workspaceId}
                title="New message"
                initialDraft={{ to: "", cc: "", subject: "", text: "" }}
                canSend={canSend}
                onCancel={closePane}
                onSent={() => {
                  setPane(null);
                  setNotice("Message sent.");
                }}
              />
            </div>
          ) : (
            <p className="m-auto px-6 text-sm text-ink-muted">Pick a conversation to read it.</p>
          )}
        </div>
      </div>
    </MailFrame>
  );
}
