import { z } from "zod";

export const memberRole = z.enum(["owner", "editor", "viewer"]);
export type MemberRole = z.infer<typeof memberRole>;

export const WORKSPACE_NAME_MAX = 80;

export const createWorkspaceInput = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(WORKSPACE_NAME_MAX, `Use ${WORKSPACE_NAME_MAX} characters or fewer`),
});
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceInput>;

export const workspaceSummary = z.object({
  id: z.uuid(),
  name: z.string(),
  role: memberRole,
  createdAt: z.iso.datetime(),
});
export type WorkspaceSummary = z.infer<typeof workspaceSummary>;

export const workspaceList = z.object({ workspaces: z.array(workspaceSummary) });

export const apiError = z.object({
  error: z.string(),
  fields: z.record(z.string(), z.string()).optional(),
  requestId: z.string().optional(),
});
export type ApiError = z.infer<typeof apiError>;
