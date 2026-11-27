import { Readable } from "node:stream";
import type { FastifyBaseLogger, FastifyRequest } from "fastify";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { and, asc, auditLog, desc, eq, files, fileVersions, folders, isNull, sql, users, type Db } from "@veritas/db";
import {
  apiError,
  blockedTypeMessage,
  createFileInput,
  createFolderInput,
  downloadLink,
  fileEntry,
  fileExtension,
  fileVersion,
  fileVersionList,
  folderEntry,
  folderListing,
  listFolderQuery,
  MAX_UPLOAD_BYTES,
  NATIVE_MIME,
  sanitizeFileName,
  trashListing,
  updateEntryInput,
  UPLOAD_TOO_LARGE_MESSAGE,
  UPLOAD_TYPES,
  uploadQuery,
  uploadTypeFor,
  type FileEntry,
  type FolderEntry,
} from "@veritas/shared";
import { HttpError } from "../agent/runtime";
import type { Auth } from "../auth/auth";
import { requireSession } from "../auth/guard";
import type { Deps } from "../deps";
import { memberRoleFor } from "../workspaces/access";
import { storeUpload, type UploadFailure } from "./store-upload";

/** Matches the SPEC: blob links live five minutes. */
export const DOWNLOAD_TTL_SECONDS = 300;
const LIST_LIMIT = 500;
const VERSION_LIMIT = 200;
/** Deeper chains are refused; it also bounds the recursive ancestor query. */
const MAX_FOLDER_DEPTH = 32;

const workspaceParams = z.object({ workspaceId: z.uuid() });
const folderParams = workspaceParams.extend({ folderId: z.uuid() });
const fileParams = workspaceParams.extend({ fileId: z.uuid() });
const versionParams = fileParams.extend({ versionId: z.uuid() });

const errors = { 400: apiError, 403: apiError, 404: apiError, 409: apiError };
const uploadErrors = { ...errors, 413: apiError, 415: apiError, 503: apiError };

type FolderRow = typeof folders.$inferSelect;
type FileRow = typeof files.$inferSelect;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const notFound = () => new HttpError(404, "Not found");

function toFolderEntry(row: FolderRow): FolderEntry {
  return {
    type: "folder",
    id: row.id,
    name: row.name,
    parentId: row.parentId,
    updatedAt: row.createdAt.toISOString(),
    deletedAt: row.deletedAt?.toISOString() ?? null,
  };
}

function toFileEntry(row: FileRow): FileEntry {
  return {
    type: "file",
    id: row.id,
    name: row.name,
    kind: row.kind,
    mime: row.mime,
    sizeBytes: row.sizeBytes,
    parentId: row.folderId,
    currentVersionId: row.currentVersionId,
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt?.toISOString() ?? null,
  };
}

function uploadFailure(failure: UploadFailure, label: string): HttpError {
  switch (failure) {
    case "too_large":
      return new HttpError(413, UPLOAD_TOO_LARGE_MESSAGE);
    case "empty":
      return new HttpError(400, "This file is empty.");
    case "invalid_content":
      return new HttpError(415, `This file isn't a valid ${label}`);
    case "unsafe_archive":
      return new HttpError(415, `This ${label} can't be opened safely. It may be damaged or packed to use too much memory.`);
    case "aborted":
      return new HttpError(400, "The upload was interrupted. Try again.");
    case "storage_unavailable":
      return new HttpError(503, "File storage is unavailable right now. Try again in a moment.");
  }
}

/** RFC 6266 attachment header with an ASCII fallback for old clients. */
export function attachmentDisposition(name: string): string {
  const fallback = name.replace(/[^\x20-\x7e]|["\\]/g, "_");
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

export function downloadName(name: string, mime: string): string {
  const ext = Object.entries(UPLOAD_TYPES).find(([, type]) => type.mime === mime)?.[0] ?? (mime.endsWith("+json") ? "json" : "");
  if (!ext || fileExtension(name) === ext || (ext === "jpeg" && fileExtension(name) === "jpg")) return name;
  return `${name}.${ext}`;
}

export function fileRoutes(deps: Deps, auth: Auth): FastifyPluginAsyncZod {
  return async (app) => {
    app.addHook("preHandler", requireSession(auth));
    // Upload bodies stay a stream; storeUpload enforces the size cap while reading.
    app.addContentTypeParser("application/octet-stream", (_request, payload, done) => done(null, payload));

    /** Non-members get 404 so workspace IDs can't be probed; viewers can read but not change anything. */
    async function authorize(workspaceId: string, userId: string, needs: "read" | "write") {
      const role = await memberRoleFor(deps.db, workspaceId, userId);
      if (!role) throw notFound();
      if (needs === "write" && role === "viewer") throw new HttpError(403, "You can view this workspace but not change its files.");
    }

    /**
     * The folder and its ancestors, root first. Null when the folder is not in
     * this workspace, or it or any ancestor is in the trash.
     */
    async function visibleChain(db: Db | Tx, workspaceId: string, folderId: string) {
      const rows = await db.execute<{ id: string; name: string; parent_id: string | null; is_deleted: boolean; depth: number }>(sql`
        WITH RECURSIVE chain AS (
          SELECT id, name, parent_id, deleted_at IS NOT NULL AS is_deleted, 0 AS depth
          FROM folders WHERE id = ${folderId} AND workspace_id = ${workspaceId}
          UNION ALL
          SELECT f.id, f.name, f.parent_id, f.deleted_at IS NOT NULL, c.depth + 1
          FROM folders f JOIN chain c ON f.id = c.parent_id
          WHERE f.workspace_id = ${workspaceId} AND c.depth < ${MAX_FOLDER_DEPTH}
        )
        SELECT id, name, parent_id, is_deleted, depth FROM chain ORDER BY depth DESC`);
      const chain = [...rows];
      if (chain.length === 0 || chain[0]!.parent_id !== null || chain.some((row) => row.is_deleted)) return null;
      return chain.map((row) => ({ id: row.id, name: row.name }));
    }

    async function requireParent(db: Db | Tx, workspaceId: string, parentId: string | null) {
      if (parentId === null) return [];
      const chain = await visibleChain(db, workspaceId, parentId);
      if (!chain) throw new HttpError(404, "That folder doesn't exist or is in the trash.");
      if (chain.length >= MAX_FOLDER_DEPTH) throw new HttpError(400, `Folders can be nested up to ${MAX_FOLDER_DEPTH} levels deep.`);
      return chain;
    }

    async function audit(db: Db | Tx, entry: { workspaceId: string; userId: string; action: string; target: string; detail?: Record<string, unknown> }) {
      await db.insert(auditLog).values({ workspaceId: entry.workspaceId, actor: "user", actorUserId: entry.userId, action: entry.action, target: entry.target, detail: entry.detail });
    }

    async function liveFile(db: Db | Tx, workspaceId: string, fileId: string) {
      const [row] = await db
        .select()
        .from(files)
        .where(and(eq(files.id, fileId), eq(files.workspaceId, workspaceId), isNull(files.deletedAt)));
      if (!row) throw notFound();
      return row;
    }

    /** Appends the next version under a row lock so concurrent saves get distinct numbers. */
    async function appendVersion(
      tx: Tx,
      input: { workspaceId: string; fileId: string; userId: string; contentHash: string; snapshotRef: string; sizeBytes: number },
    ) {
      const [locked] = await tx
        .select({ id: files.id })
        .from(files)
        .where(and(eq(files.id, input.fileId), eq(files.workspaceId, input.workspaceId), isNull(files.deletedAt)))
        .for("update");
      if (!locked) throw notFound();
      const [last] = await tx
        .select({ versionNo: sql<number>`coalesce(max(${fileVersions.versionNo}), 0)::int` })
        .from(fileVersions)
        .where(eq(fileVersions.fileId, input.fileId));
      const [version] = await tx
        .insert(fileVersions)
        .values({
          fileId: input.fileId,
          versionNo: (last?.versionNo ?? 0) + 1,
          contentHash: input.contentHash,
          snapshotRef: input.snapshotRef,
          author: "user",
          authorUserId: input.userId,
        })
        .returning();
      await tx
        .update(files)
        .set({ currentVersionId: version!.id, sizeBytes: input.sizeBytes, updatedAt: new Date() })
        .where(eq(files.id, input.fileId));
      return version!;
    }

    async function toVersionList(fileId: string, currentVersionId: string | null) {
      const rows = await deps.db
        .select({
          id: fileVersions.id,
          versionNo: fileVersions.versionNo,
          author: fileVersions.author,
          authorName: users.name,
          modelId: fileVersions.modelId,
          contentHash: fileVersions.contentHash,
          createdAt: fileVersions.createdAt,
        })
        .from(fileVersions)
        .leftJoin(users, eq(users.id, fileVersions.authorUserId))
        .where(eq(fileVersions.fileId, fileId))
        .orderBy(desc(fileVersions.versionNo))
        .limit(VERSION_LIMIT);
      return rows.map((row) => ({ ...row, isCurrent: row.id === currentVersionId, createdAt: row.createdAt.toISOString() }));
    }

    /** Streams the body to a fresh object key; throws the user-facing error on rejection. */
    async function receiveUpload(request: FastifyRequest, key: string, name: string) {
      const type = uploadTypeFor(name);
      if (!type) throw new HttpError(415, blockedTypeMessage(name));
      const declared = Number(request.headers["content-length"]);
      if (Number.isFinite(declared) && declared > MAX_UPLOAD_BYTES) throw new HttpError(413, UPLOAD_TOO_LARGE_MESSAGE);
      if (!(request.body instanceof Readable)) throw new HttpError(415, "Send the file as application/octet-stream.");

      const stored = await storeUpload({
        blob: deps.blob,
        bucket: deps.bucket,
        key,
        source: request.body,
        ext: fileExtension(name),
        mime: type.mime,
        maxBytes: MAX_UPLOAD_BYTES,
        sizeHint: Number.isFinite(declared) && declared > 0 ? declared : undefined,
        onCleanupError: (err) => request.log.warn({ err, key }, "could not remove rejected upload"),
      });
      if (!stored.ok) throw uploadFailure(stored.failure, type.label);
      return { ...stored, type };
    }

    const removeOrphan = (key: string, log: FastifyBaseLogger) =>
      deps.blob.removeObject(deps.bucket, key).catch((err: unknown) => log.warn({ err, key }, "could not remove orphaned upload"));

    app.get(
      "/api/v1/workspaces/:workspaceId/files",
      { schema: { params: workspaceParams, querystring: listFolderQuery, response: { 200: folderListing, ...errors } } },
      async (request) => {
        const { workspaceId } = request.params;
        const parentId = request.query.folderId ?? null;
        await authorize(workspaceId, request.user!.id, "read");
        const breadcrumbs = parentId ? await visibleChain(deps.db, workspaceId, parentId) : [];
        if (!breadcrumbs) throw notFound();

        const [folderRows, fileRows] = await Promise.all([
          deps.db
            .select()
            .from(folders)
            .where(and(eq(folders.workspaceId, workspaceId), parentId ? eq(folders.parentId, parentId) : isNull(folders.parentId), isNull(folders.deletedAt)))
            .orderBy(asc(folders.name))
            .limit(LIST_LIMIT + 1),
          deps.db
            .select()
            .from(files)
            .where(and(eq(files.workspaceId, workspaceId), parentId ? eq(files.folderId, parentId) : isNull(files.folderId), isNull(files.deletedAt)))
            .orderBy(asc(files.name))
            .limit(LIST_LIMIT + 1),
        ]);
        return {
          breadcrumbs,
          items: [...folderRows.slice(0, LIST_LIMIT).map(toFolderEntry), ...fileRows.slice(0, LIST_LIMIT).map(toFileEntry)],
          isTruncated: folderRows.length > LIST_LIMIT || fileRows.length > LIST_LIMIT,
        };
      },
    );

    app.get(
      "/api/v1/workspaces/:workspaceId/files/trash",
      { schema: { params: workspaceParams, response: { 200: trashListing, ...errors } } },
      async (request) => {
        const { workspaceId } = request.params;
        await authorize(workspaceId, request.user!.id, "read");
        const [folderRows, fileRows] = await Promise.all([
          deps.db
            .select()
            .from(folders)
            .where(and(eq(folders.workspaceId, workspaceId), sql`${folders.deletedAt} IS NOT NULL`))
            .orderBy(desc(folders.deletedAt))
            .limit(LIST_LIMIT + 1),
          deps.db
            .select()
            .from(files)
            .where(and(eq(files.workspaceId, workspaceId), sql`${files.deletedAt} IS NOT NULL`))
            .orderBy(desc(files.deletedAt))
            .limit(LIST_LIMIT + 1),
        ]);
        return {
          items: [...folderRows.slice(0, LIST_LIMIT).map(toFolderEntry), ...fileRows.slice(0, LIST_LIMIT).map(toFileEntry)],
          isTruncated: folderRows.length > LIST_LIMIT || fileRows.length > LIST_LIMIT,
        };
      },
    );

    app.post(
      "/api/v1/workspaces/:workspaceId/folders",
      { schema: { params: workspaceParams, body: createFolderInput, response: { 201: folderEntry, ...errors } } },
      async (request, reply) => {
        const { workspaceId } = request.params;
        const userId = request.user!.id;
        await authorize(workspaceId, userId, "write");
        const { name, parentId } = request.body;
        const row = await deps.db.transaction(async (tx) => {
          await requireParent(tx, workspaceId, parentId);
          const [created] = await tx.insert(folders).values({ workspaceId, parentId, name }).returning();
          await audit(tx, { workspaceId, userId, action: "folder.created", target: created!.id, detail: { name } });
          return created!;
        });
        return reply.code(201).send(toFolderEntry(row));
      },
    );

    app.post(
      "/api/v1/workspaces/:workspaceId/files",
      { schema: { params: workspaceParams, body: createFileInput, response: { 201: fileEntry, ...errors } } },
      async (request, reply) => {
        const { workspaceId } = request.params;
        const userId = request.user!.id;
        await authorize(workspaceId, userId, "write");
        const { name, kind, parentId } = request.body;
        const row = await deps.db.transaction(async (tx) => {
          await requireParent(tx, workspaceId, parentId);
          const id = crypto.randomUUID();
          // Empty until the editor saves its first version.
          const [created] = await tx
            .insert(files)
            .values({ id, workspaceId, folderId: parentId, kind, name, storage: "blob", storageRef: `workspaces/${workspaceId}/files/${id}/`, mime: NATIVE_MIME[kind], createdBy: userId })
            .returning();
          await audit(tx, { workspaceId, userId, action: "file.created", target: id, detail: { name, kind } });
          return created!;
        });
        return reply.code(201).send(toFileEntry(row));
      },
    );

    app.patch(
      "/api/v1/workspaces/:workspaceId/folders/:folderId",
      { schema: { params: folderParams, body: updateEntryInput, response: { 200: folderEntry, ...errors } } },
      async (request) => {
        const { workspaceId, folderId } = request.params;
        const userId = request.user!.id;
        await authorize(workspaceId, userId, "write");
        const { name, parentId } = request.body;
        const row = await deps.db.transaction(async (tx) => {
          const [current] = await tx
            .select()
            .from(folders)
            .where(and(eq(folders.id, folderId), eq(folders.workspaceId, workspaceId), isNull(folders.deletedAt)))
            .for("update");
          if (!current) throw notFound();
          if (parentId !== undefined) {
            const chain = await requireParent(tx, workspaceId, parentId);
            if (chain.some((folder) => folder.id === folderId)) throw new HttpError(400, "A folder can't go inside itself.");
          }
          const [updated] = await tx
            .update(folders)
            .set({ ...(name !== undefined ? { name } : {}), ...(parentId !== undefined ? { parentId } : {}) })
            .where(eq(folders.id, folderId))
            .returning();
          if (name !== undefined && name !== current.name) {
            await audit(tx, { workspaceId, userId, action: "folder.renamed", target: folderId, detail: { from: current.name, to: name } });
          }
          if (parentId !== undefined && parentId !== current.parentId) {
            await audit(tx, { workspaceId, userId, action: "folder.moved", target: folderId, detail: { from: current.parentId, to: parentId } });
          }
          return updated!;
        });
        return toFolderEntry(row);
      },
    );

    app.patch(
      "/api/v1/workspaces/:workspaceId/files/:fileId",
      { schema: { params: fileParams, body: updateEntryInput, response: { 200: fileEntry, ...errors } } },
      async (request) => {
        const { workspaceId, fileId } = request.params;
        const userId = request.user!.id;
        await authorize(workspaceId, userId, "write");
        const { name, parentId } = request.body;
        const row = await deps.db.transaction(async (tx) => {
          const current = await liveFile(tx, workspaceId, fileId);
          if (parentId !== undefined) await requireParent(tx, workspaceId, parentId);
          const [updated] = await tx
            .update(files)
            .set({ ...(name !== undefined ? { name } : {}), ...(parentId !== undefined ? { folderId: parentId } : {}), updatedAt: new Date() })
            .where(eq(files.id, fileId))
            .returning();
          if (name !== undefined && name !== current.name) {
            await audit(tx, { workspaceId, userId, action: "file.renamed", target: fileId, detail: { from: current.name, to: name } });
          }
          if (parentId !== undefined && parentId !== current.folderId) {
            await audit(tx, { workspaceId, userId, action: "file.moved", target: fileId, detail: { from: current.folderId, to: parentId } });
          }
          return updated!;
        });
        return toFileEntry(row);
      },
    );

    app.post(
      "/api/v1/workspaces/:workspaceId/folders/:folderId/trash",
      { schema: { params: folderParams, response: { 200: folderEntry, ...errors } } },
      async (request) => {
        const { workspaceId, folderId } = request.params;
        const userId = request.user!.id;
        await authorize(workspaceId, userId, "write");
        const row = await deps.db.transaction(async (tx) => {
          const [updated] = await tx
            .update(folders)
            .set({ deletedAt: new Date() })
            .where(and(eq(folders.id, folderId), eq(folders.workspaceId, workspaceId), isNull(folders.deletedAt)))
            .returning();
          if (!updated) throw notFound();
          await audit(tx, { workspaceId, userId, action: "folder.trashed", target: folderId, detail: { name: updated.name } });
          return updated;
        });
        return toFolderEntry(row);
      },
    );

    app.post(
      "/api/v1/workspaces/:workspaceId/files/:fileId/trash",
      { schema: { params: fileParams, response: { 200: fileEntry, ...errors } } },
      async (request) => {
        const { workspaceId, fileId } = request.params;
        const userId = request.user!.id;
        await authorize(workspaceId, userId, "write");
        const row = await deps.db.transaction(async (tx) => {
          const [updated] = await tx
            .update(files)
            .set({ deletedAt: new Date() })
            .where(and(eq(files.id, fileId), eq(files.workspaceId, workspaceId), isNull(files.deletedAt)))
            .returning();
          if (!updated) throw notFound();
          await audit(tx, { workspaceId, userId, action: "file.trashed", target: fileId, detail: { name: updated.name } });
          return updated;
        });
        return toFileEntry(row);
      },
    );

    // Restoring puts an item back in its folder; if that folder is gone or in the trash, it lands at the top level.
    app.post(
      "/api/v1/workspaces/:workspaceId/folders/:folderId/restore",
      { schema: { params: folderParams, response: { 200: folderEntry, ...errors } } },
      async (request) => {
        const { workspaceId, folderId } = request.params;
        const userId = request.user!.id;
        await authorize(workspaceId, userId, "write");
        const row = await deps.db.transaction(async (tx) => {
          const [current] = await tx
            .select()
            .from(folders)
            .where(and(eq(folders.id, folderId), eq(folders.workspaceId, workspaceId), sql`${folders.deletedAt} IS NOT NULL`))
            .for("update");
          if (!current) throw notFound();
          const parentId = current.parentId && (await visibleChain(tx, workspaceId, current.parentId)) ? current.parentId : null;
          const [updated] = await tx.update(folders).set({ deletedAt: null, parentId }).where(eq(folders.id, folderId)).returning();
          await audit(tx, { workspaceId, userId, action: "folder.restored", target: folderId, detail: { name: current.name } });
          return updated!;
        });
        return toFolderEntry(row);
      },
    );

    app.post(
      "/api/v1/workspaces/:workspaceId/files/:fileId/restore",
      { schema: { params: fileParams, response: { 200: fileEntry, ...errors } } },
      async (request) => {
        const { workspaceId, fileId } = request.params;
        const userId = request.user!.id;
        await authorize(workspaceId, userId, "write");
        const row = await deps.db.transaction(async (tx) => {
          const [current] = await tx
            .select()
            .from(files)
            .where(and(eq(files.id, fileId), eq(files.workspaceId, workspaceId), sql`${files.deletedAt} IS NOT NULL`))
            .for("update");
          if (!current) throw notFound();
          const folderId = current.folderId && (await visibleChain(tx, workspaceId, current.folderId)) ? current.folderId : null;
          const [updated] = await tx.update(files).set({ deletedAt: null, folderId, updatedAt: new Date() }).where(eq(files.id, fileId)).returning();
          await audit(tx, { workspaceId, userId, action: "file.restored", target: fileId, detail: { name: current.name } });
          return updated!;
        });
        return toFileEntry(row);
      },
    );

    app.post(
      "/api/v1/workspaces/:workspaceId/files/upload",
      { schema: { params: workspaceParams, querystring: uploadQuery, response: { 201: fileEntry, ...uploadErrors } } },
      async (request, reply) => {
        const { workspaceId } = request.params;
        const userId = request.user!.id;
        await authorize(workspaceId, userId, "write");
        const name = sanitizeFileName(request.query.name);
        const parentId = request.query.parentId ?? null;
        // Checked before any bytes are stored; re-checked in the transaction in case it was trashed meanwhile.
        await requireParent(deps.db, workspaceId, parentId);

        const id = crypto.randomUUID();
        const prefix = `workspaces/${workspaceId}/files/${id}/`;
        const key = `${prefix}${crypto.randomUUID()}`;
        const stored = await receiveUpload(request, key, name);

        try {
          const row = await deps.db.transaction(async (tx) => {
            await requireParent(tx, workspaceId, parentId);
            await tx.insert(files).values({
              id,
              workspaceId,
              folderId: parentId,
              kind: stored.type.kind,
              name,
              storage: "blob",
              storageRef: prefix,
              mime: stored.type.mime,
              sizeBytes: stored.sizeBytes,
              createdBy: userId,
            });
            await appendVersion(tx, { workspaceId, fileId: id, userId, contentHash: `sha256:${stored.sha256}`, snapshotRef: key, sizeBytes: stored.sizeBytes });
            await audit(tx, { workspaceId, userId, action: "file.uploaded", target: id, detail: { name, sizeBytes: stored.sizeBytes } });
            return liveFile(tx, workspaceId, id);
          });
          return reply.code(201).send(toFileEntry(row));
        } catch (err) {
          await removeOrphan(key, request.log);
          throw err;
        }
      },
    );

    app.get(
      "/api/v1/workspaces/:workspaceId/files/:fileId/versions",
      { schema: { params: fileParams, response: { 200: fileVersionList, ...errors } } },
      async (request) => {
        const { workspaceId, fileId } = request.params;
        await authorize(workspaceId, request.user!.id, "read");
        const file = await liveFile(deps.db, workspaceId, fileId);
        return { versions: await toVersionList(file.id, file.currentVersionId) };
      },
    );

    app.post(
      "/api/v1/workspaces/:workspaceId/files/:fileId/versions",
      { schema: { params: fileParams, response: { 201: fileVersion, ...uploadErrors } } },
      async (request, reply) => {
        const { workspaceId, fileId } = request.params;
        const userId = request.user!.id;
        await authorize(workspaceId, userId, "write");
        const file = await liveFile(deps.db, workspaceId, fileId);
        const ext = Object.entries(UPLOAD_TYPES).find(([, type]) => type.mime === file.mime)?.[0];
        if (!ext) throw new HttpError(409, "This file is edited in Veritas. Its versions are saved from the editor.");

        const key = `${file.storageRef}${crypto.randomUUID()}`;
        const stored = await receiveUpload(request, key, `upload.${ext}`);
        try {
          const version = await deps.db.transaction(async (tx) => {
            const created = await appendVersion(tx, { workspaceId, fileId, userId, contentHash: `sha256:${stored.sha256}`, snapshotRef: key, sizeBytes: stored.sizeBytes });
            await audit(tx, { workspaceId, userId, action: "file.version.uploaded", target: fileId, detail: { versionNo: created.versionNo } });
            return created;
          });
          const listed = (await toVersionList(fileId, version.id)).find((v) => v.id === version.id)!;
          return reply.code(201).send(listed);
        } catch (err) {
          await removeOrphan(key, request.log);
          throw err;
        }
      },
    );

    app.post(
      "/api/v1/workspaces/:workspaceId/files/:fileId/versions/:versionId/restore",
      { schema: { params: versionParams, response: { 201: fileVersion, ...uploadErrors } } },
      async (request, reply) => {
        const { workspaceId, fileId, versionId } = request.params;
        const userId = request.user!.id;
        await authorize(workspaceId, userId, "write");
        await liveFile(deps.db, workspaceId, fileId);
        const [source] = await deps.db
          .select()
          .from(fileVersions)
          .where(and(eq(fileVersions.id, versionId), eq(fileVersions.fileId, fileId)));
        if (!source) throw notFound();
        // Snapshots are immutable, so the new version can point at the same object.
        const stat = await deps.blob.statObject(deps.bucket, source.snapshotRef).catch(() => null);
        if (!stat) throw uploadFailure("storage_unavailable", "");

        const version = await deps.db.transaction(async (tx) => {
          const created = await appendVersion(tx, { workspaceId, fileId, userId, contentHash: source.contentHash, snapshotRef: source.snapshotRef, sizeBytes: stat.size });
          await audit(tx, { workspaceId, userId, action: "file.version.restored", target: fileId, detail: { fromVersionNo: source.versionNo, versionNo: created.versionNo } });
          return created;
        });
        const listed = (await toVersionList(fileId, version.id)).find((v) => v.id === version.id)!;
        return reply.code(201).send(listed);
      },
    );

    app.get(
      "/api/v1/workspaces/:workspaceId/files/:fileId/versions/:versionId/download",
      { schema: { params: versionParams, response: { 200: downloadLink, ...uploadErrors } } },
      async (request) => {
        const { workspaceId, fileId, versionId } = request.params;
        await authorize(workspaceId, request.user!.id, "read");
        const file = await liveFile(deps.db, workspaceId, fileId);
        const [version] = await deps.db
          .select({ snapshotRef: fileVersions.snapshotRef })
          .from(fileVersions)
          .where(and(eq(fileVersions.id, versionId), eq(fileVersions.fileId, file.id)));
        if (!version) throw notFound();
        const url = await deps.blob
          .presignedGetObject(deps.bucket, version.snapshotRef, DOWNLOAD_TTL_SECONDS, {
            "response-content-disposition": attachmentDisposition(downloadName(file.name, file.mime)),
            "response-content-type": file.mime,
          })
          .catch(() => null);
        if (!url) throw uploadFailure("storage_unavailable", "");
        return { url, expiresAt: new Date(Date.now() + DOWNLOAD_TTL_SECONDS * 1000).toISOString() };
      },
    );
  };
}
