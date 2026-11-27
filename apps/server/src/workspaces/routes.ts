import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { auditLog, desc, eq, workspaceMembers, workspaces } from "@veritas/db";
import { apiError, createWorkspaceInput, workspaceList, workspaceSummary } from "@veritas/shared";
import type { Auth } from "../auth/auth";
import { requireSession } from "../auth/guard";
import type { Deps } from "../deps";

export function workspaceRoutes(deps: Deps, auth: Auth): FastifyPluginAsyncZod {
  return async (app) => {
    app.addHook("preHandler", requireSession(auth));

    app.get("/api/v1/workspaces", { schema: { response: { 200: workspaceList } } }, async (request) => {
      const rows = await deps.db
        .select({ id: workspaces.id, name: workspaces.name, role: workspaceMembers.role, createdAt: workspaces.createdAt })
        .from(workspaceMembers)
        .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
        .where(eq(workspaceMembers.userId, request.user!.id))
        .orderBy(desc(workspaces.createdAt));
      return { workspaces: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })) };
    });

    app.post(
      "/api/v1/workspaces",
      { schema: { body: createWorkspaceInput, response: { 201: workspaceSummary, 400: apiError } } },
      async (request, reply) => {
        const userId = request.user!.id;
        const created = await deps.db.transaction(async (tx) => {
          const [ws] = await tx.insert(workspaces).values({ name: request.body.name, ownerId: userId }).returning();
          await tx.insert(workspaceMembers).values({ workspaceId: ws!.id, userId, role: "owner" });
          await tx.insert(auditLog).values({
            workspaceId: ws!.id,
            actor: "user",
            actorUserId: userId,
            action: "workspace.created",
            target: ws!.id,
          });
          return ws!;
        });
        return reply.code(201).send({ id: created.id, name: created.name, role: "owner", createdAt: created.createdAt.toISOString() });
      },
    );
  };
}
