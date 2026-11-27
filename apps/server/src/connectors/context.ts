import type { FastifyReply, FastifyRequest } from "fastify";
import type { SessionReader } from "../auth/guard";
import type { ConnectorStore, Kv } from "./store";
import type { Vault } from "./vault";

export type GoogleCredentials = { clientId: string; clientSecret: string };

/** Everything the connector and mail routes touch, injected so tests never reach Google, Postgres or Redis. */
export type ConnectorDeps = {
  store: ConnectorStore;
  kv: Kv;
  vault: Vault;
  fetch: typeof fetch;
  readSession: SessionReader;
  webOrigin: string;
  /** Null when the deployment has no Google OAuth client configured. */
  google: GoogleCredentials | null;
  now: () => number;
};

export type ConnectorErrorKind = "not_configured" | "not_connected" | "needs_reconnect" | "needs_scope" | "unavailable" | "not_found";

/** Expected connector failures. Messages are user-facing; detail from Google never reaches the client. */
export class ConnectorError extends Error {
  constructor(
    readonly kind: ConnectorErrorKind,
    /** Short scope name for needs_scope, e.g. "gmail.send". */
    readonly scope?: string,
  ) {
    super(kind);
    this.name = "ConnectorError";
  }
}

const SCOPE_COPY: Record<string, string> = {
  "gmail.readonly": "Veritas needs permission to read your Gmail. Connect your Google account again and allow it.",
  "gmail.send": "Sending needs one more Google permission. Turn on sending in Settings to allow it.",
};

export function sendConnectorError(reply: FastifyReply, err: ConnectorError) {
  const requestId = reply.request.id;
  switch (err.kind) {
    case "not_connected":
      return reply.code(409).send({ error: "Connect your Google account to use Mail.", connect: true, requestId });
    case "needs_reconnect":
      return reply
        .code(409)
        .send({ error: "Your Google connection has expired. Connect it again to keep using Mail.", connect: true, requestId });
    case "needs_scope":
      return reply.code(409).send({
        error: SCOPE_COPY[err.scope ?? ""] ?? "Veritas needs another Google permission for this.",
        connect: true,
        needsScope: err.scope,
        requestId,
      });
    case "not_found":
      return reply.code(404).send({ error: "That conversation isn't in your mailbox anymore.", requestId });
    case "not_configured":
      return reply.code(503).send({ error: "Google connections aren't set up on this server yet.", requestId });
    case "unavailable":
      return reply.code(503).send({ error: "Gmail isn't responding right now. Try again in a minute.", requestId });
  }
}

/**
 * preHandler for /workspaces/:workspaceId routes, after the session guard.
 * Non-members get 404 so workspace IDs can't be probed. Params are already
 * validated by the route schema when preHandlers run.
 */
export function requireMember(store: ConnectorStore) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    if (!(await store.memberRole(workspaceId, request.user!.id))) {
      return reply.code(404).send({ error: "Workspace not found.", requestId: request.id });
    }
  };
}

/** Runs a handler and turns ConnectorError into its response; anything else goes to the app error handler. */
export async function handleConnectorErrors<T>(reply: FastifyReply, run: () => Promise<T>) {
  try {
    return await run();
  } catch (err) {
    if (err instanceof ConnectorError) return sendConnectorError(reply, err);
    throw err;
  }
}
