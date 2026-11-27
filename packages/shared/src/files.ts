import { z } from "zod";

export const FILE_KINDS = ["doc", "sheet", "slides", "pdf", "other"] as const;
export const fileKind = z.enum(FILE_KINDS);
export type FileKind = z.infer<typeof fileKind>;

/** Kinds a user can create empty from the Files app; each opens in its own editor. */
export const NATIVE_KINDS = ["doc", "sheet", "slides"] as const;
export const nativeKind = z.enum(NATIVE_KINDS);
export type NativeKind = z.infer<typeof nativeKind>;

export const NATIVE_MIME: Record<NativeKind, string> = {
  doc: "application/vnd.veritas.doc+json",
  sheet: "application/vnd.veritas.sheet+json",
  slides: "application/vnd.veritas.slides+json",
};

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
export const UPLOAD_TOO_LARGE_MESSAGE = "Files must be 100 MB or smaller";
export const FILE_NAME_MAX = 120;

type UploadType = { mime: string; kind: FileKind; label: string };

/**
 * Extensions Veritas accepts. The server still sniffs the bytes: the extension
 * only says what the file claims to be.
 */
export const UPLOAD_TYPES: Readonly<Record<string, UploadType>> = {
  pdf: { mime: "application/pdf", kind: "pdf", label: "PDF" },
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", kind: "doc", label: "Word document" },
  xlsx: { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", kind: "sheet", label: "Excel workbook" },
  pptx: { mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", kind: "slides", label: "PowerPoint presentation" },
  csv: { mime: "text/csv", kind: "other", label: "CSV file" },
  txt: { mime: "text/plain", kind: "other", label: "text file" },
  md: { mime: "text/markdown", kind: "other", label: "Markdown file" },
  png: { mime: "image/png", kind: "other", label: "PNG image" },
  jpg: { mime: "image/jpeg", kind: "other", label: "JPEG image" },
  jpeg: { mime: "image/jpeg", kind: "other", label: "JPEG image" },
};

export function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

export function uploadTypeFor(name: string): UploadType | null {
  return UPLOAD_TYPES[fileExtension(name)] ?? null;
}

export function blockedTypeMessage(name: string): string {
  const ext = fileExtension(name);
  const what = ext ? `.${ext} files` : "files without an extension";
  return `Veritas can't store ${what}. Upload a PDF, Word, Excel, PowerPoint, CSV, text or image file.`;
}

/** Client and server run the same checks, so the browser can refuse before any bytes are sent. */
export function uploadPreflightError(file: { name: string; size: number }): string | null {
  if (file.size > MAX_UPLOAD_BYTES) return UPLOAD_TOO_LARGE_MESSAGE;
  if (file.size === 0) return "This file is empty.";
  if (!uploadTypeFor(file.name)) return blockedTypeMessage(file.name);
  return null;
}

// Path separators, Windows-reserved characters and control characters.
// eslint-disable-next-line no-control-regex
const UNSAFE_NAME_CHARS = /[\u0000-\u001f\u007f/\\:*?"<>|]/g;

/** Message for a name a user typed, or null when it is fine. */
export function fileNameError(raw: string): string | null {
  const name = raw.trim();
  if (!name) return "Enter a name.";
  if (name.length > FILE_NAME_MAX) return `Use ${FILE_NAME_MAX} characters or fewer.`;
  if (name === "." || name === "..") return "Choose a different name.";
  if (new RegExp(UNSAFE_NAME_CHARS.source).test(name)) return 'Names can\'t contain / \\ : * ? " < > |';
  return null;
}

/**
 * Turns an uploaded file's name into a safe display name: drops any path,
 * replaces unsafe characters and trims to the length cap while keeping the extension.
 */
export function sanitizeFileName(raw: string): string {
  const base = raw.split(/[/\\]/).pop() ?? "";
  let name = base.replace(UNSAFE_NAME_CHARS, "_").replace(/\s+/g, " ").trim().replace(/^[.\s]+|[.\s]+$/g, "");
  if (name.length > FILE_NAME_MAX) {
    const ext = fileExtension(name);
    const suffix = ext && ext.length < 10 ? `.${ext}` : "";
    name = name.slice(0, FILE_NAME_MAX - suffix.length).trimEnd() + suffix;
  }
  return name || "Untitled";
}

const entryName = z
  .string()
  .trim()
  .superRefine((name, ctx) => {
    const message = fileNameError(name);
    if (message) ctx.addIssue({ code: "custom", message });
  });

export const folderEntry = z.object({
  type: z.literal("folder"),
  id: z.uuid(),
  name: z.string(),
  parentId: z.uuid().nullable(),
  updatedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().nullable(),
});
export type FolderEntry = z.infer<typeof folderEntry>;

export const fileEntry = z.object({
  type: z.literal("file"),
  id: z.uuid(),
  name: z.string(),
  kind: fileKind,
  mime: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  parentId: z.uuid().nullable(),
  currentVersionId: z.uuid().nullable(),
  updatedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().nullable(),
});
export type FileEntry = z.infer<typeof fileEntry>;

export const filesEntry = z.discriminatedUnion("type", [folderEntry, fileEntry]);
export type FilesEntry = z.infer<typeof filesEntry>;

export const breadcrumb = z.object({ id: z.uuid(), name: z.string() });
export type Breadcrumb = z.infer<typeof breadcrumb>;

export const folderListing = z.object({
  /** Root first, current folder last; empty at the workspace root. */
  breadcrumbs: z.array(breadcrumb),
  items: z.array(filesEntry),
  isTruncated: z.boolean(),
});
export type FolderListing = z.infer<typeof folderListing>;

export const trashListing = z.object({ items: z.array(filesEntry), isTruncated: z.boolean() });
export type TrashListing = z.infer<typeof trashListing>;

export const listFolderQuery = z.object({ folderId: z.uuid().optional() });

export const createFolderInput = z.object({ name: entryName, parentId: z.uuid().nullable().default(null) }).strict();
export type CreateFolderInput = z.input<typeof createFolderInput>;

export const createFileInput = z.object({ name: entryName, kind: nativeKind, parentId: z.uuid().nullable().default(null) }).strict();
export type CreateFileInput = z.input<typeof createFileInput>;

export const updateEntryInput = z
  .object({ name: entryName.optional(), parentId: z.uuid().nullable().optional() })
  .strict()
  .refine((input) => input.name !== undefined || input.parentId !== undefined, { message: "Nothing to update" });
export type UpdateEntryInput = z.input<typeof updateEntryInput>;

export const uploadQuery = z.object({
  name: z.string().min(1, "Missing file name").max(1024),
  parentId: z.uuid().optional(),
});

export const fileVersion = z.object({
  id: z.uuid(),
  versionNo: z.number().int().positive(),
  author: z.enum(["user", "agent"]),
  authorName: z.string().nullable(),
  modelId: z.string().nullable(),
  contentHash: z.string(),
  isCurrent: z.boolean(),
  createdAt: z.iso.datetime(),
});
export type FileVersion = z.infer<typeof fileVersion>;

export const fileVersionList = z.object({ versions: z.array(fileVersion) });
export type FileVersionList = z.infer<typeof fileVersionList>;

export const downloadLink = z.object({ url: z.url(), expiresAt: z.iso.datetime() });
export type DownloadLink = z.infer<typeof downloadLink>;
