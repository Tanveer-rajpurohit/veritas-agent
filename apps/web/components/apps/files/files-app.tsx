"use client";

import { useEffect, useReducer, useRef, useState, type DragEvent, type ReactNode } from "react";
import type { Breadcrumb, FileEntry, FilesEntry, FolderListing, TrashListing } from "@veritas/shared";
import { Button, cx, FilesIcon } from "@veritas/ui";
import { useDesktop } from "@/components/desktop/desktop-provider";
import { apiFetch, type ApiResult } from "@/lib/api-client";
import { InlineError } from "../inline-error";
import { EntryRow, ListHeader, ListSkeleton, NameForm, RowMenu, type MenuItem } from "./entry-list";
import { NEW_ENTRY_DEFAULTS, sortEntries, type NewEntryKind } from "./files-format";
import { FolderIcon } from "./icons";
import { UploadTray } from "./upload-tray";
import { classifyUploadError, nextToStart, uploadReducer } from "./upload-state";
import { sendUpload } from "./upload-request";
import { VersionPanel } from "./version-panel";

const PARALLEL_UPLOADS = 2;
const TOOLBAR_BUTTON = "min-h-11 @2xl:min-h-8";

type ListState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; breadcrumbs: Breadcrumb[]; items: FilesEntry[]; isTruncated: boolean };

type View = { kind: "folder"; folderId: string | null } | { kind: "trash" };
type Notice = { text: string; undo?: FilesEntry } | null;

async function fetchListing(workspaceId: string, target: View): Promise<ListState> {
  const result: ApiResult<FolderListing | TrashListing> =
    target.kind === "trash"
      ? await apiFetch<TrashListing>(`/api/v1/workspaces/${workspaceId}/files/trash`)
      : await apiFetch<FolderListing>(`/api/v1/workspaces/${workspaceId}/files${target.folderId ? `?folderId=${target.folderId}` : ""}`);
  if (!result.ok) {
    return { status: "error", message: result.status === 404 && target.kind === "folder" ? "This folder was moved to the trash or no longer exists." : result.error.error };
  }
  return { status: "ready", breadcrumbs: "breadcrumbs" in result.data ? result.data.breadcrumbs : [], items: result.data.items, isTruncated: result.data.isTruncated };
}

const entryPath = (workspaceId: string, entry: FilesEntry) => `/api/v1/workspaces/${workspaceId}/${entry.type === "folder" ? "folders" : "files"}/${entry.id}`;

export function FilesApp() {
  const { workspaceId } = useDesktop();
  const [view, setView] = useState<View>({ kind: "folder", folderId: null });
  const [list, setList] = useState<ListState>({ status: "loading" });
  const [creating, setCreating] = useState<NewEntryKind | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [historyFile, setHistoryFile] = useState<FileEntry | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [actionError, setActionError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [uploads, dispatchUpload] = useReducer(uploadReducer, []);
  const viewRef = useRef(view);
  const uploadFiles = useRef(new Map<string, File>());
  const startedUploads = useRef(new Set<string>());
  const abortUploads = useRef(new Map<string, () => void>());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newMenuRef = useRef<HTMLDivElement>(null);

  const currentFolderId = view.kind === "folder" ? view.folderId : null;

  useEffect(() => {
    viewRef.current = view;
    // Only the newest request may write results, so a slow old listing can't replace a newer one.
    let isCurrent = true;
    void fetchListing(workspaceId, view).then((next) => {
      if (isCurrent) setList(next);
    });
    return () => {
      isCurrent = false;
    };
  }, [workspaceId, view, reloadKey]);

  const reload = (showSkeleton: boolean) => {
    if (showSkeleton) setList({ status: "loading" });
    setReloadKey((key) => key + 1);
  };

  const navigate = (next: View) => {
    setCreating(null);
    setRenamingId(null);
    setHistoryFile(null);
    setActionError("");
    setList({ status: "loading" });
    setView(next);
  };

  const patchItems = (fn: (items: FilesEntry[]) => FilesEntry[]) =>
    setList((prev) => (prev.status === "ready" ? { ...prev, items: fn(prev.items) } : prev));

  const create = async (kind: NewEntryKind, name: string): Promise<string | null> => {
    const parentId = currentFolderId;
    const result =
      kind === "folder"
        ? await apiFetch<FilesEntry>(`/api/v1/workspaces/${workspaceId}/folders`, { method: "POST", body: { name, parentId } })
        : await apiFetch<FilesEntry>(`/api/v1/workspaces/${workspaceId}/files`, { method: "POST", body: { name, kind, parentId } });
    if (!result.ok) return result.error.fields?.name ?? result.error.error;
    setCreating(null);
    patchItems((items) => [...items, result.data]);
    setNotice({ text: `Created ${NEW_ENTRY_DEFAULTS[kind].label.toLowerCase()} "${result.data.name}".` });
    return null;
  };

  const rename = async (entry: FilesEntry, name: string): Promise<string | null> => {
    const result = await apiFetch<FilesEntry>(entryPath(workspaceId, entry), { method: "PATCH", body: { name } });
    if (!result.ok) return result.error.fields?.name ?? result.error.error;
    setRenamingId(null);
    patchItems((items) => items.map((item) => (item.id === entry.id ? result.data : item)));
    if (historyFile?.id === entry.id && result.data.type === "file") setHistoryFile(result.data);
    return null;
  };

  const trash = async (entry: FilesEntry) => {
    setActionError("");
    const result = await apiFetch<FilesEntry>(`${entryPath(workspaceId, entry)}/trash`, { method: "POST" });
    if (!result.ok) {
      setActionError(result.error.error);
      return;
    }
    patchItems((items) => items.filter((item) => item.id !== entry.id));
    if (historyFile?.id === entry.id) setHistoryFile(null);
    setNotice({ text: `Moved "${entry.name}" to the trash.`, undo: result.data });
  };

  const restore = async (entry: FilesEntry, isUndo: boolean) => {
    setActionError("");
    const result = await apiFetch<FilesEntry>(`${entryPath(workspaceId, entry)}/restore`, { method: "POST" });
    if (!result.ok) {
      setActionError(result.error.error);
      return;
    }
    const current = viewRef.current;
    if (current.kind === "trash") patchItems((items) => items.filter((item) => item.id !== entry.id));
    else if (current.folderId === result.data.parentId) patchItems((items) => [...items.filter((item) => item.id !== entry.id), result.data]);
    const movedToTop = entry.parentId !== null && result.data.parentId === null;
    setNotice({ text: isUndo ? `Restored "${entry.name}".` : movedToTop ? `Restored "${entry.name}" to the top level because its folder is in the trash.` : `Restored "${entry.name}".` });
  };

  const addFiles = (picked: FileList | null) => {
    if (!picked || picked.length === 0) return;
    const files = Array.from(picked).map((file) => {
      const id = crypto.randomUUID();
      uploadFiles.current.set(id, file);
      return { id, name: file.name, size: file.size };
    });
    dispatchUpload({ type: "add", files, parentId: currentFolderId });
  };

  useEffect(() => {
    for (const id of nextToStart(uploads, PARALLEL_UPLOADS)) {
      const item = uploads.find((u) => u.id === id);
      const file = uploadFiles.current.get(id);
      if (!item || !file || startedUploads.current.has(id)) continue;
      startedUploads.current.add(id);
      dispatchUpload({ type: "start", id });
      const query = new URLSearchParams({ name: file.name });
      if (item.parentId) query.set("parentId", item.parentId);
      const request = sendUpload<FileEntry>(`/api/v1/workspaces/${workspaceId}/files/upload?${query}`, file, (loaded) => dispatchUpload({ type: "progress", id, loaded }));
      abortUploads.current.set(id, request.abort);
      void request.done.then((outcome) => {
        startedUploads.current.delete(id);
        abortUploads.current.delete(id);
        if (!outcome.ok) {
          dispatchUpload({ type: "fail", id, error: classifyUploadError(outcome.status, outcome.message) });
          return;
        }
        uploadFiles.current.delete(id);
        dispatchUpload({ type: "succeed", id });
        const current = viewRef.current;
        if (current.kind === "folder" && current.folderId === item.parentId) patchItems((items) => [...items.filter((i) => i.id !== outcome.data.id), outcome.data]);
      });
    }
  }, [uploads, workspaceId]);

  useEffect(() => {
    const aborts = abortUploads.current;
    return () => aborts.forEach((abort) => abort());
  }, []);

  const startCreate = (kind: NewEntryKind) => {
    newMenuRef.current?.hidePopover();
    setRenamingId(null);
    setCreating(kind);
  };

  const openNewMenu = (button: HTMLButtonElement) => {
    const menu = newMenuRef.current;
    if (!menu) return;
    menu.showPopover();
    const rect = button.getBoundingClientRect();
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - menu.offsetWidth - 8))}px`;
    menu.querySelector("button")?.focus();
  };

  const isDragWithFiles = (event: DragEvent) => view.kind === "folder" && event.dataTransfer.types.includes("Files");

  const isTrash = view.kind === "trash";
  const items = list.status === "ready" ? sortEntries(list.items) : [];
  const folderName = list.status === "ready" && list.breadcrumbs.length > 0 ? list.breadcrumbs[list.breadcrumbs.length - 1]!.name : "Files";

  const menuFor = (entry: FilesEntry): MenuItem[] =>
    isTrash
      ? [{ label: "Restore", onSelect: () => void restore(entry, false) }]
      : [
          entry.type === "folder"
            ? { label: "Open", onSelect: () => navigate({ kind: "folder", folderId: entry.id }) }
            : { label: "Version history", onSelect: () => setHistoryFile(entry) },
          { label: "Rename", onSelect: () => setRenamingId(entry.id) },
          { label: "Move to trash", onSelect: () => void trash(entry), isDanger: true },
        ];

  return (
    <div
      className="@container relative flex h-full min-h-64 flex-col"
      onDragEnter={(event) => {
        if (!isDragWithFiles(event)) return;
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragOver={(event) => {
        if (!isDragWithFiles(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false);
      }}
      onDrop={(event) => {
        if (!isDragWithFiles(event)) return;
        event.preventDefault();
        setIsDragging(false);
        addFiles(event.dataTransfer.files);
      }}
    >
      <div className="flex min-h-12 shrink-0 items-center gap-2 border-b border-line py-1 pr-2 pl-4">
        <FilesIcon className="size-4 text-ink-muted" />
        <h1 className="text-sm font-semibold">{isTrash ? "Trash" : "Files"}</h1>
        <div className="ml-auto flex min-w-0 items-center gap-2">
          {isTrash ? (
            <Button size="sm" variant="secondary" className={TOOLBAR_BUTTON} onClick={() => navigate({ kind: "folder", folderId: null })}>
              Back to files
            </Button>
          ) : (
            <>
              <Button size="sm" variant="ghost" className={TOOLBAR_BUTTON} onClick={() => navigate({ kind: "trash" })}>
                Trash
              </Button>
              <Button size="sm" variant="secondary" className={TOOLBAR_BUTTON} onClick={() => fileInputRef.current?.click()}>
                Upload
              </Button>
              <Button size="sm" className={TOOLBAR_BUTTON} aria-haspopup="menu" onClick={(event) => openNewMenu(event.currentTarget)}>
                New
              </Button>
            </>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          addFiles(event.currentTarget.files);
          event.currentTarget.value = "";
        }}
      />
      <div ref={newMenuRef} popover="auto" role="menu" aria-label="Create new" className="fixed inset-auto m-0 w-52 rounded-xl border border-line bg-surface-raised p-1.5 text-ink shadow-overlay">
        {(Object.keys(NEW_ENTRY_DEFAULTS) as NewEntryKind[]).map((kind) => (
          <button
            key={kind}
            type="button"
            role="menuitem"
            onClick={() => startCreate(kind)}
            className="flex h-11 w-full items-center rounded-lg px-3 text-left text-sm font-medium transition-colors duration-150 hover:bg-surface-hover focus-visible:bg-surface-hover @2xl:h-9"
          >
            {NEW_ENTRY_DEFAULTS[kind].label}
          </button>
        ))}
      </div>

      {!isTrash && list.status === "ready" ? <Breadcrumbs crumbs={list.breadcrumbs} onNavigate={(folderId) => navigate({ kind: "folder", folderId })} /> : null}

      <div className="flex min-h-0 flex-1">
        <div className={cx("min-h-0 w-full flex-col @3xl:flex @3xl:flex-1", historyFile ? "hidden" : "flex")}>
          {notice ? (
            <div role="status" className="m-3 mb-0 flex items-center gap-3 rounded-lg bg-surface-muted px-4 py-2 text-sm">
              <p className="min-w-0 flex-1">{notice.text}</p>
              {notice.undo ? (
                <button
                  type="button"
                  onClick={() => {
                    const entry = notice.undo!;
                    setNotice(null);
                    void restore(entry, true);
                  }}
                  className="h-11 shrink-0 rounded-lg px-3 font-semibold text-accent-text transition-colors duration-150 hover:bg-surface-hover @2xl:h-8"
                >
                  Undo
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="h-11 shrink-0 rounded-lg px-3 font-semibold text-ink-muted transition-colors duration-150 hover:bg-surface-hover hover:text-ink @2xl:h-8"
              >
                Dismiss
              </button>
            </div>
          ) : null}
          {actionError ? (
            <div className="m-3 mb-0">
              <InlineError message={actionError} />
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {list.status === "loading" ? (
              <ListSkeleton label={isTrash ? "Loading the trash" : "Loading files"} />
            ) : list.status === "error" ? (
              <div className="p-3">
                <InlineError message={list.message} onRetry={() => reload(true)} />
              </div>
            ) : (
              <>
                {items.length > 0 || creating ? <ListHeader dateLabel={isTrash ? "Deleted" : "Modified"} /> : null}
                {creating ? (
                  <div className="flex min-h-14 items-center gap-3 border-b border-line px-4 py-2">
                    {creating === "folder" ? <FolderIcon className="size-5 text-ink-muted" /> : null}
                    <NameForm
                      label={`Name for the new ${NEW_ENTRY_DEFAULTS[creating].label.toLowerCase()}`}
                      initialName={NEW_ENTRY_DEFAULTS[creating].name}
                      onSubmit={(name) => create(creating, name)}
                      onCancel={() => setCreating(null)}
                    />
                  </div>
                ) : null}
                {items.length === 0 && !creating ? (
                  isTrash ? (
                    <EmptyState title="The trash is empty" body="Files and folders you delete stay here until you restore them." />
                  ) : (
                    <EmptyState
                      title={currentFolderId ? `${folderName} is empty` : "No files yet"}
                      body="Drag files here or use Upload. You can also create a folder, document, sheet or presentation."
                    >
                      <Button variant="secondary" className="min-h-11" onClick={() => fileInputRef.current?.click()}>
                        Upload files
                      </Button>
                    </EmptyState>
                  )
                ) : (
                  <ul aria-label={isTrash ? "Trash" : `Contents of ${folderName}`} className="divide-y divide-line">
                    {items.map((entry) => (
                      <li key={entry.id}>
                        <EntryRow
                          entry={entry}
                          isSelected={historyFile?.id === entry.id}
                          isRenaming={renamingId === entry.id}
                          onOpen={
                            isTrash
                              ? undefined
                              : () => (entry.type === "folder" ? navigate({ kind: "folder", folderId: entry.id }) : setHistoryFile(entry))
                          }
                          onRename={(name) => rename(entry, name)}
                          onCancelRename={() => setRenamingId(null)}
                          actions={<RowMenu label={`Actions for ${entry.name}`} items={menuFor(entry)} />}
                        />
                      </li>
                    ))}
                  </ul>
                )}
                {list.isTruncated ? <p className="px-4 py-3 text-sm text-ink-muted">Showing the first 500 folders and files.</p> : null}
              </>
            )}
          </div>
        </div>

        {historyFile ? (
          <div className="flex min-h-0 w-full flex-col @3xl:w-80 @3xl:shrink-0 @3xl:border-l @3xl:border-line">
            <VersionPanel
              key={historyFile.id}
              workspaceId={workspaceId}
              file={historyFile}
              onClose={() => setHistoryFile(null)}
              onChanged={() => reload(false)}
            />
          </div>
        ) : null}
      </div>

      <UploadTray
        items={uploads}
        onRetry={(id) => dispatchUpload({ type: "retry", id })}
        onDismiss={(id) => {
          uploadFiles.current.delete(id);
          dispatchUpload({ type: "dismiss", id });
        }}
        onClearFinished={() => dispatchUpload({ type: "clearFinished" })}
      />

      {isDragging ? (
        <div aria-hidden className="pointer-events-none absolute inset-2 flex items-center justify-center rounded-xl border-2 border-dashed border-focus bg-surface/90">
          <p className="text-sm font-semibold">Drop to upload to {folderName}</p>
        </div>
      ) : null}
    </div>
  );
}

function Breadcrumbs({ crumbs, onNavigate }: { crumbs: Breadcrumb[]; onNavigate: (folderId: string | null) => void }) {
  const trail: { id: string | null; name: string }[] = [{ id: null, name: "Files" }, ...crumbs];
  return (
    <nav aria-label="Folder path" className="shrink-0 border-b border-line px-2 py-1">
      <ol className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
        {trail.map((crumb, index) => {
          const isLast = index === trail.length - 1;
          return (
            <li key={crumb.id ?? "root"} className="flex min-w-0 items-center gap-1">
              {index > 0 ? (
                <span aria-hidden className="text-ink-subtle">
                  /
                </span>
              ) : null}
              {isLast ? (
                <span aria-current="page" className="truncate px-2 font-semibold">
                  {crumb.name}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate(crumb.id)}
                  className="h-11 max-w-48 truncate rounded-lg px-2 text-ink-muted transition-colors duration-150 hover:bg-surface-hover hover:text-ink @2xl:h-8"
                >
                  {crumb.name}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function EmptyState({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <h2 className="text-lg font-semibold text-balance">{title}</h2>
      <p className="max-w-sm text-sm text-pretty text-ink-muted">{body}</p>
      {children}
    </div>
  );
}
