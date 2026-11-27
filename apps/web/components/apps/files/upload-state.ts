import { MAX_UPLOAD_BYTES, uploadPreflightError } from "@veritas/shared";

export type UploadErrorKind = "too_large" | "blocked" | "network" | "storage" | "server";

export type UploadError = { kind: UploadErrorKind; message: string; canRetry: boolean };

export type UploadItem = {
  id: string;
  name: string;
  size: number;
  parentId: string | null;
  status: "queued" | "uploading" | "done" | "failed";
  loaded: number;
  error: UploadError | null;
};

export type UploadAction =
  | { type: "add"; files: { id: string; name: string; size: number }[]; parentId: string | null }
  | { type: "start"; id: string }
  | { type: "progress"; id: string; loaded: number }
  | { type: "succeed"; id: string }
  | { type: "fail"; id: string; error: UploadError }
  | { type: "retry"; id: string }
  | { type: "dismiss"; id: string }
  | { type: "clearFinished" };

/** Maps an upload response (status 0 means the request never completed) to what the user sees. */
export function classifyUploadError(status: number, message: string): UploadError {
  if (status === 0) return { kind: "network", message: "The connection dropped before the upload finished.", canRetry: true };
  if (status === 413) return { kind: "too_large", message, canRetry: false };
  if (status === 415) return { kind: "blocked", message, canRetry: false };
  if (status === 503) return { kind: "storage", message: "File storage is unavailable right now. Try again in a moment.", canRetry: true };
  if (status === 401) return { kind: "server", message: "Your session ended. Sign in again, then upload the file.", canRetry: false };
  return { kind: "server", message, canRetry: status >= 500 };
}

function update(items: UploadItem[], id: string, patch: (item: UploadItem) => Partial<UploadItem>): UploadItem[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch(item) } : item));
}

export function uploadReducer(items: UploadItem[], action: UploadAction): UploadItem[] {
  switch (action.type) {
    case "add":
      return [
        ...items,
        ...action.files.map((file): UploadItem => {
          const preflight = uploadPreflightError(file);
          return {
            ...file,
            parentId: action.parentId,
            loaded: 0,
            status: preflight ? "failed" : "queued",
            error: preflight ? { kind: file.size > MAX_UPLOAD_BYTES ? "too_large" : "blocked", message: preflight, canRetry: false } : null,
          };
        }),
      ];
    case "start":
      return update(items, action.id, () => ({ status: "uploading", loaded: 0, error: null }));
    case "progress":
      return update(items, action.id, (item) => (item.status === "uploading" ? { loaded: Math.min(action.loaded, item.size) } : {}));
    case "succeed":
      return update(items, action.id, (item) => ({ status: "done", loaded: item.size, error: null }));
    case "fail":
      return update(items, action.id, () => ({ status: "failed", error: action.error }));
    case "retry":
      return update(items, action.id, (item) => (item.status === "failed" && item.error?.canRetry ? { status: "queued", loaded: 0, error: null } : {}));
    case "dismiss":
      return items.filter((item) => item.id !== action.id || item.status === "uploading");
    case "clearFinished":
      return items.filter((item) => item.status === "queued" || item.status === "uploading");
  }
}

/** Ids to start now, keeping at most `limit` uploads in flight. */
export function nextToStart(items: UploadItem[], limit: number): string[] {
  const running = items.filter((item) => item.status === "uploading").length;
  return items
    .filter((item) => item.status === "queued")
    .slice(0, Math.max(0, limit - running))
    .map((item) => item.id);
}

export function uploadPercent(item: UploadItem): number {
  return item.size === 0 ? 0 : Math.round((item.loaded / item.size) * 100);
}
