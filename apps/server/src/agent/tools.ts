import { defineTool, type ToolDefinition } from "@veritas/agent-core";
import { and, desc, eq, files, ilike, isNull, type Db } from "@veritas/db";
import { z } from "zod";

const LIST_FILES_DEFAULT = 50;
const LIST_FILES_MAX = 100;

/** Escapes LIKE wildcards so a model-supplied query matches literally. */
const likeLiteral = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

export function listWorkspaceFilesTool(db: Db): ToolDefinition {
  return defineTool({
    name: "list_workspace_files",
    description:
      "List files in the current workspace, newest first. Optionally filter by a name substring or a folder ID. Returns IDs, names, kinds and sizes; it does not return file contents.",
    kind: "read",
    input: z.object({
      query: z.string().trim().min(1).max(200).optional().describe("Case-insensitive substring of the file name"),
      folderId: z.uuid().optional().describe("Only files directly inside this folder"),
      limit: z.number().int().min(1).max(LIST_FILES_MAX).optional(),
    }),
    execute: async (input, ctx) => {
      const limit = input.limit ?? LIST_FILES_DEFAULT;
      // The workspace comes from the run, never from the model, so a folder or
      // query can only narrow results inside the caller's own workspace.
      const rows = await db
        .select({
          id: files.id,
          name: files.name,
          kind: files.kind,
          folderId: files.folderId,
          sizeBytes: files.sizeBytes,
          updatedAt: files.updatedAt,
        })
        .from(files)
        .where(
          and(
            eq(files.workspaceId, ctx.workspaceId),
            isNull(files.deletedAt),
            input.folderId ? eq(files.folderId, input.folderId) : undefined,
            input.query ? ilike(files.name, `%${likeLiteral(input.query)}%`) : undefined,
          ),
        )
        .orderBy(desc(files.updatedAt))
        .limit(limit + 1);
      return {
        files: rows.slice(0, limit).map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() })),
        truncated: rows.length > limit,
      };
    },
  });
}
