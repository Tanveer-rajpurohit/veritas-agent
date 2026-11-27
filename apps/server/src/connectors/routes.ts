import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { apiError, connectorList, connectorStartQuery } from "@veritas/shared";
import { z } from "zod";
import { requireSessionFrom } from "../auth/guard";
import { requireMember, sendConnectorError, ConnectorError, type ConnectorDeps } from "./context";
import {
  buildAuthUrl,
  callbackUrl,
  consumeState,
  createPkce,
  emailFromIdToken,
  exchangeCode,
  GMAIL_READONLY,
  revokeToken,
  saveState,
  scopesFor,
} from "./google/oauth";
import { openTokens, sealTokens } from "./google/tokens";
import type { ConnectorKey } from "./store";

const workspaceParams = z.object({ workspaceId: z.uuid() });

/** Failure codes the settings page understands. They say what kind of problem, never Google's detail. */
type CallbackError = "denied" | "state" | "session" | "scope_denied" | "failed" | "unavailable";

const callbackQuery = z.object({
  code: z.string().max(2048).optional(),
  state: z.string().max(256).optional(),
  error: z.string().max(256).optional(),
});

export function connectorRoutes(deps: ConnectorDeps): FastifyPluginAsyncZod {
  return async (app) => {
    const guard = [requireSessionFrom(deps.readSession), requireMember(deps.store)];
    const redirectUri = callbackUrl(deps.webOrigin);
    const settingsUrl = (workspaceId: string, query: Record<string, string>) => {
      const url = new URL(`/w/${workspaceId}/settings`, deps.webOrigin);
      url.search = new URLSearchParams(query).toString();
      return url.toString();
    };
    const rootUrl = (error: CallbackError) => new URL(`/?connector_error=${error}`, deps.webOrigin).toString();

    app.get(
      "/api/v1/workspaces/:workspaceId/connectors/google/start",
      { preHandler: guard, schema: { params: workspaceParams, querystring: connectorStartQuery, response: { 503: apiError } } },
      async (request, reply) => {
        if (!deps.google) return sendConnectorError(reply, new ConnectorError("not_configured"));
        const { verifier, challenge } = createPkce();
        const scopes = scopesFor(request.query.features);
        const state = await saveState(deps.kv, {
          userId: request.user!.id,
          workspaceId: request.params.workspaceId,
          verifier,
          scopes,
        });
        return reply.redirect(buildAuthUrl(deps.google, { redirectUri, state, challenge, scopes }), 302);
      },
    );

    // Google redirects the browser here, so every outcome is a redirect back to the web app.
    app.get("/api/v1/connectors/google/callback", { schema: { querystring: callbackQuery } }, async (request, reply) => {
      const { code, state, error } = request.query;
      if (!state) return reply.redirect(rootUrl("state"), 302);
      const pending = await consumeState(deps.kv, state);
      if (!pending) return reply.redirect(rootUrl("state"), 302);
      const fail = (reason: CallbackError) => reply.redirect(settingsUrl(pending.workspaceId, { connector_error: reason }), 302);

      // The state is bound to the user who started the flow; a different session can't finish it.
      const user = await deps.readSession(request);
      if (!user || user === "unverified" || user.id !== pending.userId) return fail("session");
      if (error) return fail(error === "access_denied" ? "denied" : "failed");
      if (!code) return fail("failed");
      if (!deps.google) return fail("unavailable");
      if (!(await deps.store.memberRole(pending.workspaceId, user.id))) return reply.redirect(rootUrl("failed"), 302);

      let tokens;
      try {
        tokens = await exchangeCode(deps.fetch, deps.google, { code, verifier: pending.verifier, redirectUri, now: deps.now() });
      } catch (err) {
        request.log.warn({ reason: err instanceof Error ? err.message : "unknown" }, "google code exchange failed");
        return fail("failed");
      }

      // Granular consent lets the user untick Gmail; without read access there's nothing to connect.
      if (!tokens.scopes.includes(GMAIL_READONLY)) return fail("scope_denied");
      const accountEmail = emailFromIdToken(tokens.idToken, deps.google.clientId);
      if (!accountEmail) return fail("failed");

      const key: ConnectorKey = { workspaceId: pending.workspaceId, userId: user.id, provider: "google" };
      let refreshToken = tokens.refreshToken;
      if (!refreshToken) {
        // prompt=consent normally returns one; fall back to the stored token for the same account.
        const existing = await deps.store.find(key);
        refreshToken = existing?.accountEmail === accountEmail ? openTokens(deps, existing).refreshToken : undefined;
      }
      if (!refreshToken) return fail("failed");

      await deps.store.connect(
        key,
        {
          ...sealTokens(deps, key, { accessToken: tokens.accessToken, refreshToken }),
          expiresAt: tokens.expiresAt,
          scopes: tokens.scopes,
          accountEmail,
        },
        {
          workspaceId: key.workspaceId,
          actorUserId: user.id,
          action: "connector.connected",
          target: "google",
          detail: { scopes: tokens.scopes },
        },
      );
      return reply.redirect(settingsUrl(pending.workspaceId, { connected: "google" }), 302);
    });

    app.get(
      "/api/v1/workspaces/:workspaceId/connectors",
      { preHandler: guard, schema: { params: workspaceParams, response: { 200: connectorList } } },
      async (request) => {
        const rows = await deps.store.list(request.params.workspaceId, request.user!.id);
        return {
          connectors: rows.map((r) => ({
            provider: r.provider,
            accountEmail: r.accountEmail,
            scopes: r.scopes,
            connectedAt: r.createdAt.toISOString(),
            status: r.status,
          })),
        };
      },
    );

    app.delete(
      "/api/v1/workspaces/:workspaceId/connectors/google",
      { preHandler: guard, schema: { params: workspaceParams } },
      async (request, reply) => {
        const key: ConnectorKey = { workspaceId: request.params.workspaceId, userId: request.user!.id, provider: "google" };
        const row = await deps.store.find(key);
        if (!row) return reply.code(204).send();

        if (!(await deps.store.isAccountUsedElsewhere(row))) {
          let refreshToken: string | null = null;
          try {
            refreshToken = openTokens(deps, row).refreshToken;
          } catch {
            // Undecryptable (e.g. retired key): nothing to revoke, still disconnect.
          }
          if (refreshToken && !(await revokeToken(deps.fetch, refreshToken))) {
            request.log.warn("google token revoke failed; disconnecting locally");
          }
        }
        await deps.store.disconnect(row.id, {
          workspaceId: key.workspaceId,
          actorUserId: key.userId,
          action: "connector.disconnected",
          target: "google",
        });
        return reply.code(204).send();
      },
    );
  };
}
