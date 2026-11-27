import { and, eq, workspaceMembers, type Db } from "@veritas/db";
import type { MemberRole } from "@veritas/shared";

const RANK: Record<MemberRole, number> = { viewer: 0, editor: 1, owner: 2 };

/**
 * The workspace is the authorization boundary. Returns the caller's role,
 * or null when they are not a member or their role is below `minRole`.
 * Callers answer null with 404 so workspace IDs can't be probed.
 */
export async function memberRoleFor(db: Db, workspaceId: string, userId: string, minRole: MemberRole = "viewer") {
  const [row] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1);
  if (!row || RANK[row.role] < RANK[minRole]) return null;
  return row.role;
}
