"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { fileNameError, type FilesEntry } from "@veritas/shared";
import { cx } from "@veritas/ui";
import { formatFullDate, formatRelativeTime } from "../mail/mail-format";
import { formatBytes, kindLabel } from "./files-format";
import { EntryIcon, MoreIcon } from "./icons";

export const ROW_ACTION_CLASS =
  "flex size-11 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors duration-150 hover:bg-surface-hover hover:text-ink @2xl:size-8";

export type MenuItem = { label: string; onSelect: () => void; isDanger?: boolean };

/** A popover menu anchored to its trigger. Native popover gives Escape and light dismiss for free. */
export function RowMenu({ label, items }: { label: string; items: MenuItem[] }) {
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const open = () => {
    const menu = menuRef.current;
    const trigger = triggerRef.current;
    if (!menu || !trigger) return;
    menu.showPopover();
    const rect = trigger.getBoundingClientRect();
    const width = menu.offsetWidth;
    const below = rect.bottom + 4 + menu.offsetHeight <= window.innerHeight;
    menu.style.top = `${below ? rect.bottom + 4 : rect.top - 4 - menu.offsetHeight}px`;
    menu.style.left = `${Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))}px`;
    menu.querySelector("button")?.focus();
  };

  const choose = (item: MenuItem) => {
    menuRef.current?.hidePopover();
    triggerRef.current?.focus();
    item.onSelect();
  };

  return (
    <>
      <button ref={triggerRef} type="button" aria-label={label} aria-haspopup="menu" onClick={open} className={ROW_ACTION_CLASS}>
        <MoreIcon className="size-4" />
      </button>
      <div ref={menuRef} popover="auto" role="menu" aria-label={label} className="fixed inset-auto m-0 w-48 rounded-xl border border-line bg-surface-raised p-1.5 text-ink shadow-overlay">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            onClick={() => choose(item)}
            className={cx(
              "flex h-11 w-full items-center rounded-lg px-3 text-left text-sm font-medium transition-colors duration-150 hover:bg-surface-hover focus-visible:bg-surface-hover @2xl:h-9",
              item.isDanger && "text-danger",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}

/** Inline name field for creating and renaming. Enter saves, Escape cancels. */
export function NameForm({
  label,
  initialName,
  onSubmit,
  onCancel,
}: {
  label: string;
  initialName: string;
  /** Resolves to an error message to show, or null when saved. */
  onSubmit: (name: string) => Promise<string | null>;
  onCancel: () => void;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    // Select the name without its extension so typing replaces only the part people change.
    const dot = initialName.lastIndexOf(".");
    input.setSelectionRange(0, dot > 0 ? dot : initialName.length);
  }, [initialName]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = inputRef.current?.value.trim() ?? "";
    const problem = fileNameError(name);
    if (problem) {
      setError(problem);
      return;
    }
    if (name === initialName.trim()) {
      onCancel();
      return;
    }
    setIsSaving(true);
    const failure = await onSubmit(name);
    setIsSaving(false);
    if (failure) setError(failure);
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="flex min-w-0 flex-1 flex-col gap-1">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          id={id}
          defaultValue={initialName}
          maxLength={200}
          disabled={isSaving}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              onCancel();
            }
          }}
          className={cx(
            "h-11 min-w-0 flex-1 rounded-lg border bg-surface px-3 text-sm text-ink @2xl:h-9",
            "focus-visible:border-ink focus-visible:ring-4 focus-visible:ring-focus/15 focus-visible:outline-none",
            error ? "border-danger" : "border-line-strong",
          )}
        />
        <button
          type="submit"
          disabled={isSaving}
          className="h-11 shrink-0 rounded-lg bg-accent px-3 text-sm font-semibold text-accent-ink transition-colors duration-150 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 @2xl:h-9"
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-11 shrink-0 rounded-lg px-3 text-sm font-semibold text-ink-muted transition-colors duration-150 hover:bg-surface-hover hover:text-ink @2xl:h-9"
        >
          Cancel
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}

function EntryLabel({ entry }: { entry: FilesEntry }) {
  const when = entry.deletedAt ?? entry.updatedAt;
  return (
    <>
      <EntryIcon entry={entry} className="size-5 text-ink-muted" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-ink">{entry.name}</span>
        <span className="truncate text-xs text-ink-subtle @2xl:hidden">
          {kindLabel(entry)}
          {entry.type === "file" ? ` · ${formatBytes(entry.sizeBytes)}` : ""} · {formatRelativeTime(when)}
        </span>
      </span>
    </>
  );
}

export function EntryRow({
  entry,
  isSelected,
  isRenaming,
  onOpen,
  onRename,
  onCancelRename,
  actions,
}: {
  entry: FilesEntry;
  isSelected: boolean;
  isRenaming: boolean;
  /** Absent for rows that only offer menu actions, such as items in the trash. */
  onOpen?: () => void;
  onRename: (name: string) => Promise<string | null>;
  onCancelRename: () => void;
  actions: ReactNode;
}) {
  const when = entry.deletedAt ?? entry.updatedAt;
  return (
    <div className={cx("flex min-h-14 items-center gap-2 px-2 py-1 @2xl:min-h-11 @2xl:px-3", isSelected && "bg-surface-selected")}>
      {isRenaming ? (
        <div className="flex min-w-0 flex-1 items-center gap-3 pl-2">
          <EntryIcon entry={entry} className="size-5 text-ink-muted" />
          <NameForm label={`New name for ${entry.name}`} initialName={entry.name} onSubmit={onRename} onCancel={onCancelRename} />
        </div>
      ) : onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          aria-current={isSelected ? "true" : undefined}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg px-2 text-left transition-colors duration-150 hover:bg-surface-hover @2xl:min-h-9"
        >
          <EntryLabel entry={entry} />
        </button>
      ) : (
        <div className="flex min-h-11 min-w-0 flex-1 items-center gap-3 px-2 @2xl:min-h-9">
          <EntryLabel entry={entry} />
        </div>
      )}
      {isRenaming ? null : (
        <>
          <span className="hidden w-28 shrink-0 truncate text-sm text-ink-muted @2xl:block">{kindLabel(entry)}</span>
          <span className="hidden w-20 shrink-0 text-right text-sm text-ink-muted tabular-nums @2xl:block">
            {entry.type === "file" ? formatBytes(entry.sizeBytes) : ""}
          </span>
          <time dateTime={when} title={formatFullDate(when)} className="hidden w-24 shrink-0 text-right text-sm text-ink-muted tabular-nums @2xl:block">
            {formatRelativeTime(when)}
          </time>
          {actions}
        </>
      )}
    </div>
  );
}

export function ListHeader({ dateLabel }: { dateLabel: string }) {
  return (
    <div aria-hidden className="hidden h-9 items-center gap-2 border-b border-line px-3 text-xs font-medium text-ink-subtle @2xl:flex">
      <span className="flex-1 pl-9">Name</span>
      <span className="w-28">Kind</span>
      <span className="w-20 text-right">Size</span>
      <span className="w-24 text-right">{dateLabel}</span>
      <span className="w-8" />
    </div>
  );
}

const SKELETON_ROWS = 6;

export function ListSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="divide-y divide-line">
      {Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <div key={i} aria-hidden className="flex min-h-14 items-center gap-3 px-4 @2xl:min-h-11">
          <div className="size-5 animate-pulse rounded bg-surface-selected motion-reduce:animate-none" />
          <div className="h-3.5 animate-pulse rounded bg-surface-selected motion-reduce:animate-none" style={{ width: `${40 + ((i * 17) % 35)}%` }} />
        </div>
      ))}
    </div>
  );
}
