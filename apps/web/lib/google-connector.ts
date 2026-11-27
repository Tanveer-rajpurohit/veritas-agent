import type { ConnectorSummary, GoogleFeature } from "@veritas/shared";

const SCOPE_PREFIX = "https://www.googleapis.com/auth/";
export const GMAIL_READ_SCOPE = `${SCOPE_PREFIX}gmail.readonly`;
export const GMAIL_SEND_SCOPE = `${SCOPE_PREFIX}gmail.send`;

export type GoogleConnection =
  | { kind: "not_connected" }
  | { kind: "needs_reconnect"; connector: ConnectorSummary }
  | { kind: "connected"; connector: ConnectorSummary; canSend: boolean };

/** What Mail and Settings should offer, from the workspace's connector list. */
export function googleConnection(connectors: readonly ConnectorSummary[]): GoogleConnection {
  const connector = connectors.find((c) => c.provider === "google");
  if (!connector) return { kind: "not_connected" };
  // Without read access there is no mailbox to show, so it behaves like an expired connection.
  if (connector.status === "needs_reconnect" || !connector.scopes.includes(GMAIL_READ_SCOPE)) {
    return { kind: "needs_reconnect", connector };
  }
  return { kind: "connected", connector, canSend: connector.scopes.includes(GMAIL_SEND_SCOPE) };
}

/** The server answers with a redirect to Google, so the browser must load it as a page, not fetch it. */
export function googleConnectUrl(workspaceId: string, features: readonly GoogleFeature[]): string {
  return `/api/v1/workspaces/${workspaceId}/connectors/google/start?features=${features.join(",")}`;
}

export function startGoogleConnect(workspaceId: string, features: readonly GoogleFeature[]): void {
  window.location.assign(googleConnectUrl(workspaceId, features));
}

const SCOPE_WORDS: Record<string, string> = {
  [GMAIL_READ_SCOPE]: "Read your Gmail",
  [GMAIL_SEND_SCOPE]: "Send mail as you",
};

/** Plain-language list of what the user allowed. Sign-in scopes (openid, email) are implied, so they're left out. */
export function describeScopes(scopes: readonly string[]): string[] {
  return scopes.flatMap((scope) => (SCOPE_WORDS[scope] ? [SCOPE_WORDS[scope]] : []));
}

export type ConnectNotice = { tone: "success" | "error"; text: string };

const CONNECTOR_ERRORS: Record<string, string> = {
  denied: "You didn't give Veritas access, so nothing was connected. Connect again whenever you're ready.",
  state: "That Google sign-in link expired or was already used. Start again from here.",
  session: "Google sign-in finished in a different Veritas session. Make sure you're signed in here, then connect again.",
  scope_denied: "Veritas needs permission to read your Gmail. Connect again and leave the Gmail box ticked.",
  failed: "Google didn't finish connecting your account. Try again.",
  unavailable: "Google connections aren't set up on this server yet.",
};

/** The message for the query the OAuth callback redirects back with, or null when there is none. */
export function connectNoticeFrom(params: Pick<URLSearchParams, "get">): ConnectNotice | null {
  if (params.get("connected") === "google") {
    return { tone: "success", text: "Your Google account is connected. Your inbox is ready in Mail." };
  }
  const error = params.get("connector_error");
  if (error === null) return null;
  return { tone: "error", text: CONNECTOR_ERRORS[error] ?? CONNECTOR_ERRORS.failed! };
}
