"use client";

import { useEffect, useId, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@veritas/ui";
import { InlineError } from "@/components/apps/inline-error";
import { useGoogleConnection } from "@/hooks/connectors/use-google-connection";
import { apiFetch } from "@/lib/api-client";
import { connectNoticeFrom, describeScopes, GMAIL_SEND_SCOPE, startGoogleConnect, type ConnectNotice } from "@/lib/google-connector";

const connectedDate = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

export function ConnectedAccounts({ workspaceId }: { workspaceId: string }) {
  const { state, reload } = useGoogleConnection(workspaceId);
  const searchParams = useSearchParams();
  // Read once: the callback query is cleared from the address bar below, but the message should stay.
  const [notice, setNotice] = useState<ConnectNotice | null>(() => connectNoticeFrom(searchParams));
  const [isConfirmingDisconnect, setIsConfirmingDisconnect] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const titleId = useId();

  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("connected") && !url.searchParams.has("connector_error")) return;
    url.searchParams.delete("connected");
    url.searchParams.delete("connector_error");
    // A reload shouldn't repeat "connected" or an old error.
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, []);

  const connect = (withSending: boolean) => {
    setIsRedirecting(true);
    startGoogleConnect(workspaceId, withSending ? ["gmail", "gmail_send"] : ["gmail"]);
  };

  const disconnect = async () => {
    setIsDisconnecting(true);
    const result = await apiFetch<null>(`/api/v1/workspaces/${workspaceId}/connectors/google`, { method: "DELETE" });
    setIsDisconnecting(false);
    setIsConfirmingDisconnect(false);
    if (result.ok) {
      setNotice({ tone: "success", text: "Your Google account is disconnected. Veritas can no longer read or send your mail." });
      void reload();
    } else {
      setNotice({ tone: "error", text: result.error.error });
    }
  };

  // Reconnecting asks again for everything the user had allowed, so sending keeps working.
  const hadSending =
    state.status === "ready" && state.connection.kind !== "not_connected" && state.connection.connector.scopes.includes(GMAIL_SEND_SCOPE);

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id={titleId} className="text-base font-semibold">
          Connected accounts
        </h2>
        <p className="text-sm text-ink-muted">Accounts Veritas can use for you in this workspace. Only you can see and use your connections.</p>
      </div>

      {notice ? (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={
            notice.tone === "error"
              ? "rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger"
              : "rounded-lg bg-success-soft px-4 py-3 text-sm text-success"
          }
        >
          {notice.text}
        </p>
      ) : null}

      <div className="flex flex-col gap-4 rounded-xl border border-line p-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold">Google</h3>
          <p className="text-sm text-ink-muted">Gmail for the Mail app and the agent.</p>
        </div>

        {state.status === "loading" ? (
          <p role="status" className="text-sm text-ink-muted">
            Checking your connection…
          </p>
        ) : state.status === "error" ? (
          <InlineError message={state.message} onRetry={() => void reload()} />
        ) : state.connection.kind === "not_connected" ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm">Not connected.</p>
            <Button size="lg" isLoading={isRedirecting} loadingLabel="Opening Google…" onClick={() => connect(false)}>
              Connect Google
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-ink-muted">Status</dt>
              <dd>{state.connection.kind === "connected" ? "Connected" : "Needs to be reconnected"}</dd>
              <dt className="text-ink-muted">Account</dt>
              <dd className="min-w-0 break-words">{state.connection.connector.accountEmail ?? "Unknown account"}</dd>
              <dt className="text-ink-muted">Connected</dt>
              <dd className="tabular-nums">{connectedDate.format(new Date(state.connection.connector.connectedAt))}</dd>
              <dt className="text-ink-muted">Allowed</dt>
              <dd>
                {describeScopes(state.connection.connector.scopes).length > 0 ? (
                  <ul>
                    {describeScopes(state.connection.connector.scopes).map((words) => (
                      <li key={words}>{words}</li>
                    ))}
                  </ul>
                ) : (
                  "Nothing yet"
                )}
              </dd>
            </dl>

            {isConfirmingDisconnect ? (
              <div role="group" aria-label="Confirm disconnect" className="flex flex-col gap-3 rounded-lg bg-surface-muted p-4">
                <p className="text-sm">
                  Disconnect Google? Mail stops showing your inbox and the agent can no longer read your mail. You can connect again later.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="danger" size="lg" isLoading={isDisconnecting} loadingLabel="Disconnecting…" onClick={() => void disconnect()}>
                    Disconnect
                  </Button>
                  <Button variant="ghost" size="lg" disabled={isDisconnecting} onClick={() => setIsConfirmingDisconnect(false)}>
                    Keep connected
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {state.connection.kind === "needs_reconnect" ? (
                  <Button
                    size="lg"
                    isLoading={isRedirecting}
                    loadingLabel="Opening Google…"
                    onClick={() => connect(hadSending)}
                  >
                    Reconnect
                  </Button>
                ) : !state.connection.canSend ? (
                  <Button variant="secondary" size="lg" isLoading={isRedirecting} loadingLabel="Opening Google…" onClick={() => connect(true)}>
                    Allow sending
                  </Button>
                ) : null}
                <Button variant="ghost" size="lg" onClick={() => setIsConfirmingDisconnect(true)}>
                  Disconnect
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
