import { accounts, auditLog, eq, fileVersions, inArray, sql, users, workspaceMembers, workspaces } from "@veritas/db";
import type { FileEntry, FileVersion, FolderEntry, FolderListing, TrashListing } from "@veritas/shared";
import { hashPassword } from "better-auth/crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { createDeps, ensureBucket, type Deps } from "../deps";
import { loadEnv, type Env } from "../env";
import { minimalDocx, minimalPdf } from "./test-zip";

const url = process.env.DATABASE_URL;
const PASSWORD = "correct-horse-battery";

describe.skipIf(!url)("files API (needs DATABASE_URL, REDIS_URL and the blob store)", () => {
  let env: Env;
  let deps: Deps;
  let app: Awaited<ReturnType<typeof buildApp>>;
  const createdUsers: string[] = [];
  const createdWorkspaces: string[] = [];

  type TestUser = { id: string; cookie: string; workspaceId: string };
  let alice: TestUser;
  let bob: TestUser;
  let carol: TestUser;

  async function createUser(label: string, ip: string): Promise<TestUser> {
    const id = `test-${crypto.randomUUID()}`;
    const email = `${id}@example.test`;
    createdUsers.push(id);
    await deps.db.insert(users).values({ id, name: label, email, emailVerified: true });
    await deps.db.insert(accounts).values({ id: crypto.randomUUID(), accountId: id, providerId: "credential", userId: id, password: await hashPassword(PASSWORD) });
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/sign-in/email",
      headers: { origin: env.WEB_ORIGIN, "x-forwarded-for": ip },
      payload: { email, password: PASSWORD },
    });
    expect(res.statusCode).toBe(200);
    const setCookie = res.headers["set-cookie"];
    const cookie = (Array.isArray(setCookie) ? setCookie : [setCookie ?? ""]).map((c) => c.split(";")[0]).join("; ");
    const [ws] = await deps.db.insert(workspaces).values({ name: `${label} workspace`, ownerId: id }).returning();
    await deps.db.insert(workspaceMembers).values({ workspaceId: ws!.id, userId: id, role: "owner" });
    createdWorkspaces.push(ws!.id);
    return { id, cookie, workspaceId: ws!.id };
  }

  const as = (user: TestUser) => ({ cookie: user.cookie });
  const ws = (user: TestUser, workspaceId = user.workspaceId) => `/api/v1/workspaces/${workspaceId}`;

  async function createFolder(user: TestUser, name: string, parentId: string | null = null) {
    const res = await app.inject({ method: "POST", url: `${ws(user)}/folders`, headers: as(user), payload: { name, parentId } });
    expect(res.statusCode).toBe(201);
    return res.json<FolderEntry>();
  }

  async function createDoc(user: TestUser, name: string, parentId: string | null = null) {
    const res = await app.inject({ method: "POST", url: `${ws(user)}/files`, headers: as(user), payload: { name, kind: "doc", parentId } });
    expect(res.statusCode).toBe(201);
    return res.json<FileEntry>();
  }

  function upload(user: TestUser, name: string, body: Buffer, parentId?: string) {
    const query = new URLSearchParams({ name });
    if (parentId) query.set("parentId", parentId);
    return app.inject({
      method: "POST",
      url: `${ws(user)}/files/upload?${query}`,
      headers: { ...as(user), "content-type": "application/octet-stream" },
      payload: body,
    });
  }

  const list = async (user: TestUser, folderId?: string) =>
    (await app.inject({ method: "GET", url: `${ws(user)}/files${folderId ? `?folderId=${folderId}` : ""}`, headers: as(user) })).json<FolderListing>();

  beforeAll(async () => {
    env = loadEnv({ ...process.env, NODE_ENV: "test" });
    deps = createDeps(env);
    await ensureBucket(deps);
    app = await buildApp(env, deps);
    const suffix = Math.floor(Math.random() * 200) + 20;
    alice = await createUser("Alice", `203.0.113.${suffix}`);
    bob = await createUser("Bob", `198.51.100.${suffix}`);
    carol = await createUser("Carol", `192.0.2.${suffix}`);
    await deps.db.insert(workspaceMembers).values({ workspaceId: alice.workspaceId, userId: carol.id, role: "viewer" });
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    for (const workspaceId of createdWorkspaces) {
      const keys: string[] = [];
      for await (const item of deps.blob.listObjectsV2(deps.bucket, `workspaces/${workspaceId}/`, true)) {
        if (item.name) keys.push(item.name);
      }
      if (keys.length > 0) await deps.blob.removeObjects(deps.bucket, keys);
    }
    if (createdUsers.length > 0) {
      await deps.db.delete(workspaces).where(inArray(workspaces.ownerId, createdUsers));
      await deps.db.delete(users).where(inArray(users.id, createdUsers));
    }
    await deps?.close();
  }, 30_000);

  it("creates a folder and a doc inside it, renames, trashes and restores it back to its folder", async () => {
    const clients = await createFolder(alice, "Clients");
    const doc = await createDoc(alice, "Engagement letter", clients.id);
    expect(doc).toMatchObject({ kind: "doc", parentId: clients.id, currentVersionId: null });

    const inside = await list(alice, clients.id);
    expect(inside.breadcrumbs).toEqual([{ id: clients.id, name: "Clients" }]);
    expect(inside.items.map((i) => i.name)).toEqual(["Engagement letter"]);

    const renamed = await app.inject({ method: "PATCH", url: `${ws(alice)}/files/${doc.id}`, headers: as(alice), payload: { name: "Engagement letter (signed)" } });
    expect(renamed.json<FileEntry>().name).toBe("Engagement letter (signed)");

    expect((await app.inject({ method: "POST", url: `${ws(alice)}/files/${doc.id}/trash`, headers: as(alice) })).statusCode).toBe(200);
    expect((await list(alice, clients.id)).items).toEqual([]);
    const trash = (await app.inject({ method: "GET", url: `${ws(alice)}/files/trash`, headers: as(alice) })).json<TrashListing>();
    expect(trash.items.map((i) => i.id)).toContain(doc.id);

    const restored = await app.inject({ method: "POST", url: `${ws(alice)}/files/${doc.id}/restore`, headers: as(alice) });
    expect(restored.json<FileEntry>()).toMatchObject({ parentId: clients.id, deletedAt: null });
    expect((await list(alice, clients.id)).items.map((i) => i.name)).toEqual(["Engagement letter (signed)"]);

    const actions = await deps.db.select({ action: auditLog.action }).from(auditLog).where(eq(auditLog.target, doc.id));
    expect(actions.map((a) => a.action).sort()).toEqual(["file.created", "file.renamed", "file.restored", "file.trashed"]);
  });

  it("hides a trashed folder's contents and restores a file to the top level when its folder is in the trash", async () => {
    const matters = await createFolder(alice, "Matters");
    const doc = await createDoc(alice, "Notes", matters.id);
    await app.inject({ method: "POST", url: `${ws(alice)}/files/${doc.id}/trash`, headers: as(alice) });
    await app.inject({ method: "POST", url: `${ws(alice)}/folders/${matters.id}/trash`, headers: as(alice) });
    expect((await app.inject({ method: "GET", url: `${ws(alice)}/files?folderId=${matters.id}`, headers: as(alice) })).statusCode).toBe(404);

    const restored = await app.inject({ method: "POST", url: `${ws(alice)}/files/${doc.id}/restore`, headers: as(alice) });
    expect(restored.json<FileEntry>().parentId).toBeNull();
  });

  it("refuses to put a folder inside itself", async () => {
    const parent = await createFolder(alice, "Parent");
    const child = await createFolder(alice, "Child", parent.id);
    const res = await app.inject({ method: "PATCH", url: `${ws(alice)}/folders/${parent.id}`, headers: as(alice), payload: { parentId: child.id } });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: "A folder can't go inside itself.", requestId: expect.any(String) });
  });

  it("validates names and rejects unknown fields", async () => {
    const slash = await app.inject({ method: "POST", url: `${ws(alice)}/folders`, headers: as(alice), payload: { name: "a/b" } });
    expect(slash.statusCode).toBe(400);
    const extra = await app.inject({ method: "POST", url: `${ws(alice)}/files`, headers: as(alice), payload: { name: "x", kind: "doc", workspaceId: bob.workspaceId } });
    expect(extra.statusCode).toBe(400);
    const badKind = await app.inject({ method: "POST", url: `${ws(alice)}/files`, headers: as(alice), payload: { name: "x", kind: "pdf" } });
    expect(badKind.statusCode).toBe(400);
  });

  it("returns 404 to non-members on every files route", async () => {
    const folder = await createFolder(alice, "Private");
    const doc = await createDoc(alice, "Private memo");
    const someId = crypto.randomUUID();
    const foreign = ws(bob, alice.workspaceId);
    const attempts = await Promise.all([
      app.inject({ method: "GET", url: `${foreign}/files`, headers: as(bob) }),
      app.inject({ method: "GET", url: `${foreign}/files/trash`, headers: as(bob) }),
      app.inject({ method: "POST", url: `${foreign}/folders`, headers: as(bob), payload: { name: "x" } }),
      app.inject({ method: "POST", url: `${foreign}/files`, headers: as(bob), payload: { name: "x", kind: "doc" } }),
      app.inject({ method: "PATCH", url: `${foreign}/folders/${folder.id}`, headers: as(bob), payload: { name: "x" } }),
      app.inject({ method: "PATCH", url: `${foreign}/files/${doc.id}`, headers: as(bob), payload: { name: "x" } }),
      app.inject({ method: "POST", url: `${foreign}/files/${doc.id}/trash`, headers: as(bob) }),
      app.inject({ method: "POST", url: `${foreign}/folders/${folder.id}/restore`, headers: as(bob) }),
      app.inject({ method: "GET", url: `${foreign}/files/${doc.id}/versions`, headers: as(bob) }),
      app.inject({ method: "GET", url: `${foreign}/files/${doc.id}/versions/${someId}/download`, headers: as(bob) }),
      app.inject({ method: "POST", url: `${foreign}/files/${doc.id}/versions/${someId}/restore`, headers: as(bob) }),
      upload({ ...bob, workspaceId: alice.workspaceId }, "a.pdf", minimalPdf()),
    ]);
    expect(attempts.map((r) => r.statusCode)).toEqual(attempts.map(() => 404));
    expect((await app.inject({ method: "GET", url: `${ws(alice)}/files` })).statusCode).toBe(401);
  });

  it("rejects IDs from another workspace even inside the caller's own workspace", async () => {
    const aliceFolder = await createFolder(alice, "Alice only");
    const aliceDoc = await createDoc(alice, "Alice doc");
    const bobDoc = await createDoc(bob, "Bob doc");

    const nested = await app.inject({ method: "POST", url: `${ws(bob)}/folders`, headers: as(bob), payload: { name: "Sneaky", parentId: aliceFolder.id } });
    expect(nested.statusCode).toBe(404);
    const moved = await app.inject({ method: "PATCH", url: `${ws(bob)}/files/${bobDoc.id}`, headers: as(bob), payload: { parentId: aliceFolder.id } });
    expect(moved.statusCode).toBe(404);
    const renamed = await app.inject({ method: "PATCH", url: `${ws(bob)}/files/${aliceDoc.id}`, headers: as(bob), payload: { name: "Mine now" } });
    expect(renamed.statusCode).toBe(404);
    expect((await app.inject({ method: "GET", url: `${ws(bob)}/files?folderId=${aliceFolder.id}`, headers: as(bob) })).statusCode).toBe(404);
    expect((await upload(bob, "a.pdf", minimalPdf(), aliceFolder.id)).statusCode).toBe(404);
  });

  it("lets viewers read but not change files", async () => {
    expect((await app.inject({ method: "GET", url: `${ws(carol, alice.workspaceId)}/files`, headers: as(carol) })).statusCode).toBe(200);
    const res = await app.inject({ method: "POST", url: `${ws(carol, alice.workspaceId)}/folders`, headers: as(carol), payload: { name: "x" } });
    expect(res.statusCode).toBe(403);
  });

  it("uploads a PDF and a docx under the workspace prefix with the right kinds", async () => {
    const pdf = await upload(alice, "../Term sheet.pdf", minimalPdf());
    expect(pdf.statusCode).toBe(201);
    expect(pdf.json<FileEntry>()).toMatchObject({ name: "Term sheet.pdf", kind: "pdf", mime: "application/pdf", sizeBytes: minimalPdf().length });

    const docx = await upload(alice, "Brief.docx", minimalDocx());
    expect(docx.json<FileEntry>().kind).toBe("doc");

    const [version] = await deps.db.select().from(fileVersions).where(eq(fileVersions.fileId, pdf.json<FileEntry>().id));
    expect(version!.snapshotRef.startsWith(`workspaces/${alice.workspaceId}/files/`)).toBe(true);
    expect(version!.contentHash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect((await deps.blob.statObject(deps.bucket, version!.snapshotRef)).size).toBe(minimalPdf().length);
  });

  it("explains rejected uploads", async () => {
    const exe = await upload(alice, "invoice.pdf", Buffer.concat([Buffer.from("MZ"), Buffer.alloc(9000, 0x90)]));
    expect(exe.statusCode).toBe(415);
    expect(exe.json().error).toBe("This file isn't a valid PDF");

    const blocked = await upload(alice, "setup.exe", Buffer.from("MZ"));
    expect(blocked.statusCode).toBe(415);
    expect(blocked.json().error).toMatch(/can't store \.exe files/);

    const tooBig = await app.inject({
      method: "POST",
      url: `${ws(alice)}/files/upload?name=big.pdf`,
      headers: { ...as(alice), "content-type": "application/octet-stream", "content-length": String(120 * 1024 * 1024) },
      payload: minimalPdf(),
    });
    expect(tooBig.statusCode).toBe(413);
    expect(tooBig.json().error).toBe("Files must be 100 MB or smaller");
  });

  it("keeps versions immutable: restore makes a new version and leaves the old ones untouched", async () => {
    const first = minimalPdf();
    const created = (await upload(alice, "Agreement.pdf", first)).json<FileEntry>();
    const base = `${ws(alice)}/files/${created.id}/versions`;
    const second = Buffer.concat([first, Buffer.from("% revised\n")]);
    const v2 = await app.inject({ method: "POST", url: base, headers: { ...as(alice), "content-type": "application/octet-stream" }, payload: second });
    expect(v2.statusCode).toBe(201);
    expect(v2.json<FileVersion>()).toMatchObject({ versionNo: 2, isCurrent: true, authorName: "Alice" });

    const before = await deps.db.select().from(fileVersions).where(eq(fileVersions.fileId, created.id));
    const v1 = before.find((v) => v.versionNo === 1)!;
    const v3 = await app.inject({ method: "POST", url: `${base}/${v1.id}/restore`, headers: as(alice) });
    expect(v3.statusCode).toBe(201);
    expect(v3.json<FileVersion>()).toMatchObject({ versionNo: 3, contentHash: v1.contentHash, isCurrent: true });

    const after = await deps.db.select().from(fileVersions).where(eq(fileVersions.fileId, created.id));
    for (const original of before) expect(after.find((v) => v.id === original.id)).toEqual(original);
    await expect(deps.db.execute(sql`UPDATE file_versions SET content_hash = 'x' WHERE id = ${v1.id}`)).rejects.toThrow();

    const listed = (await app.inject({ method: "GET", url: base, headers: as(alice) })).json<{ versions: FileVersion[] }>();
    expect(listed.versions.map((v) => v.versionNo)).toEqual([3, 2, 1]);

    const link = await app.inject({ method: "GET", url: `${base}/${v1.id}/download`, headers: as(alice) });
    expect(link.statusCode).toBe(200);
    const { url: signed } = link.json<{ url: string }>();
    expect(signed).toContain("X-Amz-Expires=300");
    expect(decodeURIComponent(signed)).toContain('attachment; filename="Agreement.pdf"');
    const downloaded = await fetch(signed);
    expect(Buffer.from(await downloaded.arrayBuffer()).equals(first)).toBe(true);
  });

  it("refuses uploaded versions for files edited in Veritas", async () => {
    const doc = await createDoc(alice, "Draft");
    const res = await app.inject({
      method: "POST",
      url: `${ws(alice)}/files/${doc.id}/versions`,
      headers: { ...as(alice), "content-type": "application/octet-stream" },
      payload: minimalPdf(),
    });
    expect(res.statusCode).toBe(409);
  });
});
