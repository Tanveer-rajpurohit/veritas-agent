"use client";

import { useState, type FormEvent } from "react";
import { DESKTOP_NAME_MAX } from "@veritas/shared";
import { cx, Orb, PlusIcon, SidebarIcon } from "@veritas/ui";
import { AppLink } from "./app-link";
import { useDesktop } from "./desktop-provider";

export function Sidebar({ onCollapse }: { onCollapse: () => void }) {
  const { workspaceName, desktops, currentDesktopId, selectDesktop, createDesktop } = useDesktop();
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    if (!name) {
      setError("Name is required");
      return;
    }
    setIsSaving(true);
    const result = await createDesktop(name);
    setIsSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError("");
    setIsAdding(false);
  };

  return (
    <aside aria-label="Desktops" className="flex w-58 shrink-0 flex-col gap-6 px-3 pt-2 pb-4 max-lg:hidden">
      <div className="flex h-10 items-center justify-between gap-2">
        <AppLink
          app="home"
          className="flex min-w-0 items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm font-semibold transition-colors duration-150 hover:bg-surface/70"
        >
          <Orb size={20} />
          <span className="truncate">{workspaceName}</span>
        </AppLink>
        <button
          type="button"
          aria-label="Collapse sidebar"
          aria-expanded="true"
          onClick={onCollapse}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors duration-150 hover:bg-surface/70 hover:text-ink"
        >
          <SidebarIcon className="size-5" />
        </button>
      </div>

      <nav aria-label="Your desktops" className="flex flex-col gap-1">
        <p className="px-2 pb-1 font-mono text-xs tracking-wide text-ink-muted uppercase">Desktops</p>
        {desktops.map((desktop) => {
          const isCurrent = desktop.id === currentDesktopId;
          return (
            <button
              key={desktop.id}
              type="button"
              aria-current={isCurrent ? "true" : undefined}
              onClick={() => selectDesktop(desktop.id)}
              className={cx(
                "flex h-10 items-center rounded-lg px-3 text-left text-sm font-medium transition-[background-color,color,transform] duration-150 ease-out-soft active:scale-[0.98]",
                isCurrent ? "bg-surface text-ink shadow-raised" : "text-ink-muted hover:bg-surface/70 hover:text-ink",
              )}
            >
              <span className="truncate">{desktop.name}</span>
            </button>
          );
        })}

        {isAdding ? (
          <form onSubmit={onCreate} noValidate className="flex flex-col gap-1 pt-1">
            <input
              name="name"
              aria-label="Desktop name"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "new-desktop-error" : undefined}
              placeholder="Name, like Data room"
              maxLength={DESKTOP_NAME_MAX + 10}
              autoFocus
              disabled={isSaving}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setIsAdding(false);
                  setError("");
                }
              }}
              className="h-10 rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-subtle"
            />
            {error ? (
              <p id="new-desktop-error" className="px-1 text-xs text-danger">
                {error}
              </p>
            ) : null}
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm text-ink-muted transition-colors duration-150 hover:bg-surface/70 hover:text-ink"
          >
            <PlusIcon className="size-4" />
            New desktop
          </button>
        )}
      </nav>
    </aside>
  );
}
