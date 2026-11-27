"use client";

import { useEffect, useRef, useState } from "react";
import { uploadPreflightError, uploadTypeFor, UPLOAD_TYPES, type DownloadLink, type FileEntry, type FileVersion, type FileVersionList } from "@veritas/shared";
import { CloseIcon, cx } from "@veritas/ui";
import { apiFetch } from "@/lib/api-client";
import { InlineError } from "../inline-error";
import { formatFullDate, formatRelativeTime } from "../mail/mail-format";
import { shortHash } from "./files-format";
import { ROW_ACTION_CLASS } from "./entry-list";
import { classifyUploadError } from "./upload-state";
import { sendUpload } from "./upload-request";

type PanelState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; versions: FileVersion[] };

const SMALL_BUTTON =
  "h-11 rounded-lg border border-line-strong bg-surface px-3 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50 @2xl:h-8";

export function VersionPanel({ workspaceId, file, onClose, onChanged }: { workspaceId: string; file: FileEntry; onClose: () => void; onChanged: () => void }) {
  const base = `/api/v1/workspaces/${workspaceId}/files/${file.id}/versions`;
  const [state, setState] = useState<PanelState>({ status: "loading" });
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const uploadType = Object.entries(UPLOAD_TYPES).find(([, type]) => type.mime === file.mime);

  const load = async () => {
    const result = await apiFetch<FileVersionList>(base);
    setState(result.ok ? { status: "ready", versions: result.data.versions } : { status: "error", message: result.error.error });
  };

  useEffect(() => {
    headingRef.current?.focus();
    void apiFetch<FileVersionList>(base).then((result) =>
      setState(result.ok ? { status: "ready", versions: result.data.versions } : { status: "error", message: result.error.error }),
    );
  }, [base]);

  const download = async (version: FileVersion) => {
    setActionError("");
    setBusyId(version.id);
    const result = await apiFetch<DownloadLink>(`${base}/${version.id}/download`);
    setBusyId(null);
    if (!result.ok) {
      setActionError(result.error.error);
      return;
    }
    // The link answers with Content-Disposition: attachment, so the page stays put.
    window.location.assign(result.data.url);
  };

  const restore = async (version: FileVersion) => {
    setActionError("");
    setBusyId(version.id);
    const result = await apiFetch<FileVersion>(`${base}/${version.id}/restore`, { method: "POST" });
    setBusyId(null);
    if (!result.ok) {
      setActionError(result.error.error);
      return;
    }
    await load();
    onChanged();
  };

  const uploadVersion = async (picked: File) => {
    setActionError("");
    const problem = uploadPreflightError(picked);
    if (problem) return setActionError(problem);
    if (uploadTypeFor(picked.name)?.mime !== file.mime) return setActionError(`Choose a ${uploadType?.[1].label ?? "file of the same type"} to add a new version.`);
    setUploadProgress(0);
    const outcome = await sendUpload<FileVersion>(base, picked, (loaded) => setUploadProgress(Math.round((loaded / picked.size) * 100))).done;
    setUploadProgress(null);
    if (!outcome.ok) return setActionError(classifyUploadError(outcome.status, outcome.message).message);
    await load();
    onChanged();
  };

  return (
    <aside aria-labelledby={`${file.id}-history`} className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-12 shrink-0 items-center gap-2 border-b border-line pr-2 pl-4">
        <div className="min-w-0 flex-1">
          <h2 id={`${file.id}-history`} ref={headingRef} tabIndex={-1} className="text-sm font-semibold focus:outline-none">
            Version history
          </h2>
          <p className="truncate text-xs text-ink-muted">{file.name}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close version history" className={ROW_ACTION_CLASS}>
          <CloseIcon className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {actionError ? (
          <div className="p-3">
            <InlineError message={actionError} />
          </div>
        ) : null}
        {uploadType ? (
          <div className="flex flex-col gap-2 border-b border-line p-3">
            <input
              ref={inputRef}
              type="file"
              accept={`.${uploadType[0]}`}
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(event) => {
                const picked = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (picked) void uploadVersion(picked);
              }}
            />
            <button type="button" className={SMALL_BUTTON} disabled={uploadProgress !== null} onClick={() => inputRef.current?.click()}>
              {uploadProgress === null ? "Upload a new version" : `Uploading ${uploadProgress}%`}
            </button>
          </div>
        ) : null}

        {state.status === "loading" ? (
          <p role="status" className="px-4 py-8 text-center text-sm text-ink-muted">
            Loading versions…
          </p>
        ) : state.status === "error" ? (
          <div className="p-3">
            <InlineError message={state.message} onRetry={() => void load()} />
          </div>
        ) : state.versions.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-ink-muted">No versions yet. A version is saved each time this file changes.</p>
        ) : (
          <ol aria-label={`Versions of ${file.name}`} className="divide-y divide-line">
            {state.versions.map((version) => (
              <li key={version.id} className={cx("flex flex-col gap-2 px-4 py-3", version.isCurrent && "bg-surface-muted")}>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold tabular-nums">Version {version.versionNo}</span>
                  {version.isCurrent ? <span className="text-xs font-medium text-ink-muted">Current</span> : null}
                  <time dateTime={version.createdAt} title={formatFullDate(version.createdAt)} className="ml-auto text-xs text-ink-subtle tabular-nums">
                    {formatRelativeTime(version.createdAt)}
                  </time>
                </div>
                <p className="text-xs text-ink-muted">
                  {version.author === "agent" ? `Veritas agent${version.modelId ? ` (${version.modelId})` : ""}` : (version.authorName ?? "Former member")}
                  <span className="font-mono"> · {shortHash(version.contentHash)}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={SMALL_BUTTON} disabled={busyId !== null} onClick={() => void download(version)} aria-label={`Download version ${version.versionNo}`}>
                    Download
                  </button>
                  {version.isCurrent ? null : (
                    <button type="button" className={SMALL_BUTTON} disabled={busyId !== null} onClick={() => void restore(version)} aria-label={`Restore version ${version.versionNo} as a new version`}>
                      Restore
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </aside>
  );
}
