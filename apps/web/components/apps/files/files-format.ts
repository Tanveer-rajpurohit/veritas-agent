import type { FileKind, FilesEntry } from "@veritas/shared";

const UNITS = ["KB", "MB", "GB"] as const;

/** 1 KB = 1024 bytes, matching the 100 MB upload cap users are told about. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  const rounded = value < 10 ? Math.round(value * 10) / 10 : Math.round(value);
  return `${rounded} ${UNITS[unit]}`;
}

const KIND_LABELS: Record<FileKind, string> = {
  doc: "Document",
  sheet: "Sheet",
  slides: "Presentation",
  pdf: "PDF",
  other: "File",
};

export function kindLabel(entry: FilesEntry): string {
  return entry.type === "folder" ? "Folder" : KIND_LABELS[entry.kind];
}

/** Folders first, then by name the way people expect ("Exhibit 2" before "Exhibit 10"). */
export function sortEntries(entries: FilesEntry[]): FilesEntry[] {
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
  return [...entries].sort((a, b) => (a.type === b.type ? collator.compare(a.name, b.name) : a.type === "folder" ? -1 : 1));
}

export function shortHash(contentHash: string): string {
  return contentHash.replace(/^sha256:/, "").slice(0, 8);
}

export type NewEntryKind = "folder" | "doc" | "sheet" | "slides";

export const NEW_ENTRY_DEFAULTS: Record<NewEntryKind, { label: string; name: string }> = {
  folder: { label: "Folder", name: "Untitled folder" },
  doc: { label: "Document", name: "Untitled document" },
  sheet: { label: "Sheet", name: "Untitled sheet" },
  slides: { label: "Presentation", name: "Untitled presentation" },
};
