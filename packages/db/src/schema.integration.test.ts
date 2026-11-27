import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { createDb } from "./client";
import { fileVersions, files, users, workspaces } from "./schema";

const url = process.env.DATABASE_URL;

describe.skipIf(!url)("schema invariants (needs DATABASE_URL)", () => {
  const { db, sql: client } = createDb(url ?? "", { max: 1 });
  afterAll(() => client.end());

  it("rejects updates to file_versions", async () => {
    const userId = `test-${crypto.randomUUID()}`;
    await db.insert(users).values({ id: userId, name: "Test", email: `${userId}@example.test` });
    try {
      const [ws] = await db.insert(workspaces).values({ name: "Immutability", ownerId: userId }).returning();
      const [file] = await db
        .insert(files)
        .values({ workspaceId: ws!.id, kind: "doc", name: "a", storage: "blob", storageRef: "k", mime: "application/json", createdBy: userId })
        .returning();
      const [version] = await db
        .insert(fileVersions)
        .values({ fileId: file!.id, versionNo: 1, contentHash: "h1", snapshotRef: "s1", author: "user", authorUserId: userId })
        .returning();

      await expect(db.update(fileVersions).set({ contentHash: "tampered" }).where(eq(fileVersions.id, version!.id))).rejects.toThrow();

      const [row] = await db.select().from(fileVersions).where(eq(fileVersions.id, version!.id));
      expect(row?.contentHash).toBe("h1");
    } finally {
      await db.execute(sql`delete from workspaces where owner_id = ${userId}`);
      await db.delete(users).where(eq(users.id, userId));
    }
  });

  it("generates time-ordered uuidv7 ids", async () => {
    const rows = await db.execute<{ id: string }>(sql`select uuidv7()::text as id`);
    expect(rows[0]?.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7/);
  });
});
