import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { and, asc, desktops, eq, sql } from "@veritas/db";
import {
  apiError,
  createDesktopInput,
  desktopLayout,
  desktopList,
  desktopSummary,
  EMPTY_LAYOUT,
  updateDesktopInput,
  type DesktopLayout,
} from "@veritas/shared";
import type { Auth } from "../auth/auth";
import { requireSession } from "../auth/guard";
import type { Deps } from "../deps";
import { memberRoleFor } from "../workspaces/access";

/** Enough for real use; stops a runaway client from filling the table. */
const MAX_DESKTOPS = 30;
const DEFAULT_DESKTOP_NAME = "Home";
const HOME_LAYOUT: DesktopLayout = {
  panes: [{ id: "pane-home", tabs: [{ id: "tab-home", app: "home" }], activeTabId: "tab-home" }],
  split: 0.5,
  focusedPaneId: "pane-home",
};

const workspaceParams = z.object({ workspaceId: z.uuid() });
const desktopParams = workspaceParams.extend({ desktopId: z.uuid() });
const notFound = { error: "Not found" };

type Row = typeof desktops.$inferSelect;

function toSummary(row: Row) {
  // Stored layouts were validated on write; a row from an older schema falls back to empty.
  const layout = desktopLayout.safeParse(row.layout);
  return {
    id: row.id,
    name: row.name,
    position: row.position,
    layout: layout.success ? layout.data : EMPTY_LAYOUT,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function desktopRoutes(deps: Deps, auth: Auth): FastifyPluginAsyncZod {
  return async (app) => {
    app.addHook("preHandler", requireSession(auth));

    const owned = (workspaceId: string, userId: string) =>
      and(eq(desktops.workspaceId, workspaceId), eq(desktops.userId, userId));

    app.get(
      "/api/v1/workspaces/:workspaceId/desktops",
      { schema: { params: workspaceParams, response: { 200: desktopList, 404: apiError } } },
      async (request, reply) => {
        const { workspaceId } = request.params;
        const userId = request.user!.id;
        if (!(await memberRoleFor(deps.db, workspaceId, userId))) return reply.code(404).send(notFound);

        let rows = await deps.db.select().from(desktops).where(owned(workspaceId, userId)).orderBy(asc(desktops.position));
        if (rows.length === 0) {
          // First visit: every member starts with a Home desktop.
          rows = await deps.db
            .insert(desktops)
            .values({ workspaceId, userId, name: DEFAULT_DESKTOP_NAME, position: 0, layout: HOME_LAYOUT })
            .returning();
        }
        return { desktops: rows.map(toSummary) };
      },
    );

    app.post(
      "/api/v1/workspaces/:workspaceId/desktops",
      {
        schema: {
          params: workspaceParams,
          body: createDesktopInput,
          response: { 201: desktopSummary, 400: apiError, 404: apiError, 409: apiError },
        },
      },
      async (request, reply) => {
        const { workspaceId } = request.params;
        const userId = request.user!.id;
        if (!(await memberRoleFor(deps.db, workspaceId, userId))) return reply.code(404).send(notFound);

        const [stats] = await deps.db
          .select({ count: sql<number>`count(*)::int`, maxPosition: sql<number>`coalesce(max(${desktops.position}), -1)::int` })
          .from(desktops)
          .where(owned(workspaceId, userId));
        if ((stats?.count ?? 0) >= MAX_DESKTOPS) {
          return reply.code(409).send({ error: `You can have up to ${MAX_DESKTOPS} desktops. Delete one to add another.` });
        }
        const [row] = await deps.db
          .insert(desktops)
          .values({ workspaceId, userId, name: request.body.name, position: (stats?.maxPosition ?? -1) + 1, layout: EMPTY_LAYOUT })
          .returning();
        return reply.code(201).send(toSummary(row!));
      },
    );

    app.patch(
      "/api/v1/workspaces/:workspaceId/desktops/:desktopId",
      { schema: { params: desktopParams, body: updateDesktopInput, response: { 200: desktopSummary, 400: apiError, 404: apiError } } },
      async (request, reply) => {
        const { workspaceId, desktopId } = request.params;
        const userId = request.user!.id;
        if (!(await memberRoleFor(deps.db, workspaceId, userId))) return reply.code(404).send(notFound);

        const [row] = await deps.db
          .update(desktops)
          .set({
            ...(request.body.name !== undefined ? { name: request.body.name } : {}),
            ...(request.body.layout !== undefined ? { layout: request.body.layout } : {}),
            updatedAt: new Date(),
          })
          .where(and(eq(desktops.id, desktopId), owned(workspaceId, userId)))
          .returning();
        if (!row) return reply.code(404).send(notFound);
        return toSummary(row);
      },
    );

    app.delete(
      "/api/v1/workspaces/:workspaceId/desktops/:desktopId",
      { schema: { params: desktopParams, response: { 204: z.null(), 404: apiError, 409: apiError } } },
      async (request, reply) => {
        const { workspaceId, desktopId } = request.params;
        const userId = request.user!.id;
        if (!(await memberRoleFor(deps.db, workspaceId, userId))) return reply.code(404).send(notFound);

        const [stats] = await deps.db.select({ count: sql<number>`count(*)::int` }).from(desktops).where(owned(workspaceId, userId));
        if ((stats?.count ?? 0) <= 1) return reply.code(409).send({ error: "Keep at least one desktop." });

        const deleted = await deps.db
          .delete(desktops)
          .where(and(eq(desktops.id, desktopId), owned(workspaceId, userId)))
          .returning({ id: desktops.id });
        if (deleted.length === 0) return reply.code(404).send(notFound);
        return reply.code(204).send(null);
      },
    );
  };
}
