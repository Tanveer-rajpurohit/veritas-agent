import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { FastifyRequest } from "fastify";
import {
  apiError,
  connectorRequired,
  mailThread,
  mailThreadList,
  mailThreadParams,
  mailThreadsQuery,
  sendMailInput,
  sendMailResult,
  type MailThreadSummary,
} from "@veritas/shared";
import { z } from "zod";
import { requireSessionFrom } from "../auth/guard";
import { ConnectorError, handleConnectorErrors, requireMember, type ConnectorDeps } from "../connectors/context";
import { createGmailClient, mapWithConcurrency, THREAD_FETCH_CONCURRENCY } from "../connectors/google/gmail";
import { GMAIL_READONLY, GMAIL_SEND, shortScope } from "../connectors/google/oauth";
import { getAccessToken } from "../connectors/google/tokens";
import { buildMimeMessage, MimeError, toGmailRaw } from "./mime";
import { headerOf, summarizeThread, toMailThread } from "./parse";

const workspaceParams = z.object({ workspaceId: z.uuid() });
const errors = { 404: apiError, 409: connectorRequired, 503: apiError };

export function mailRoutes(deps: ConnectorDeps): FastifyPluginAsyncZod {
  return async (app) => {
    const guard = [requireSessionFrom(deps.readSession), requireMember(deps.store)];

    /** The caller's Gmail client for this workspace, or a ConnectorError saying what's missing. */
    async function gmailFor(request: FastifyRequest, workspaceId: string, scope: string) {
      const row = await deps.store.find({ workspaceId, userId: request.user!.id, provider: "google" });
      if (!row) throw new ConnectorError("not_connected");
      if (row.status === "needs_reconnect") throw new ConnectorError("needs_reconnect");
      if (!row.scopes.includes(scope)) throw new ConnectorError("needs_scope", shortScope(scope));
      return { row, gmail: createGmailClient(deps.fetch, (rejected) => getAccessToken(deps, row, rejected)) };
    }

    app.get(
      "/api/v1/workspaces/:workspaceId/mail/threads",
      { preHandler: guard, schema: { params: workspaceParams, querystring: mailThreadsQuery, response: { 200: mailThreadList, ...errors } } },
      (request, reply) =>
        handleConnectorErrors(reply, async () => {
          const { gmail } = await gmailFor(request, request.params.workspaceId, GMAIL_READONLY);
          const page = await gmail.listThreads(request.query);
          const summaries = await mapWithConcurrency(page.threads, THREAD_FETCH_CONCURRENCY, async ({ id }) => {
            try {
              return summarizeThread(await gmail.getThreadMetadata(id));
            } catch (err) {
              // Deleted between list and get: drop it rather than fail the page.
              if (err instanceof ConnectorError && err.kind === "not_found") return null;
              throw err;
            }
          });
          return {
            threads: summaries.filter((t): t is MailThreadSummary => t !== null),
            nextPageToken: page.nextPageToken ?? null,
          };
        }),
    );

    // Marking a thread read needs gmail.modify, which we don't ask for yet, so opening leaves it unread in Gmail.
    app.get(
      "/api/v1/workspaces/:workspaceId/mail/threads/:threadId",
      { preHandler: guard, schema: { params: mailThreadParams, response: { 200: mailThread, ...errors } } },
      (request, reply) =>
        handleConnectorErrors(reply, async () => {
          const { gmail } = await gmailFor(request, request.params.workspaceId, GMAIL_READONLY);
          return toMailThread(await gmail.getThread(request.params.threadId));
        }),
    );

    app.post(
      "/api/v1/workspaces/:workspaceId/mail/send",
      {
        preHandler: guard,
        schema: { params: workspaceParams, body: sendMailInput, response: { 201: sendMailResult, 400: apiError, ...errors } },
      },
      (request, reply) =>
        handleConnectorErrors(reply, async () => {
          const { workspaceId } = request.params;
          const { row, gmail } = await gmailFor(request, workspaceId, GMAIL_SEND);
          const input = request.body;

          let threadId = input.threadId;
          let inReplyTo: string | undefined;
          let references: string | undefined;
          if (input.inReplyToMessageId) {
            // Replying needs the original's headers, which only gmail.readonly can read.
            if (!row.scopes.includes(GMAIL_READONLY)) throw new ConnectorError("needs_scope", shortScope(GMAIL_READONLY));
            const original = await gmail.getMessageHeaders(input.inReplyToMessageId);
            inReplyTo = headerOf(original.payload?.headers, "Message-ID");
            const priorRefs = headerOf(original.payload?.headers, "References");
            references = [priorRefs, inReplyTo].filter(Boolean).join(" ") || undefined;
            threadId = original.threadId;
          }

          let raw: string;
          try {
            raw = toGmailRaw(
              buildMimeMessage({
                from: row.accountEmail ?? undefined,
                to: input.to,
                cc: input.cc,
                subject: input.subject,
                text: input.text,
                inReplyTo,
                references,
                date: new Date(deps.now()),
              }),
            );
          } catch (err) {
            if (err instanceof MimeError) {
              return reply.code(400).send({ error: err.message, fields: { [err.field]: err.message }, requestId: request.id });
            }
            throw err;
          }

          const sent = await gmail.send(raw, threadId);
          await deps.store.audit({
            workspaceId,
            actorUserId: request.user!.id,
            action: "mail.sent",
            target: sent.id,
            detail: { provider: "google", threadId: sent.threadId, recipients: input.to.length + input.cc.length },
          });
          return reply.code(201).send(sent);
        }),
    );
  };
}
