"use client";

import { useRef, useState } from "react";
import type { AppId, WindowPane } from "@veritas/shared";
import { CloseIcon, cx, PlusIcon } from "@veritas/ui";
import { APPS, getApp } from "@/lib/apps";
import { AppContent } from "./app-content";
import { useDesktop } from "./desktop-provider";

/** Matches the exit animation; also the fallback when animations are switched off. */
const CLOSE_FALLBACK_MS = 220;

export function WindowFrame({ pane, isFocused }: { pane: WindowPane; isFocused: boolean }) {
  const { dispatch } = useDesktop();
  const [isClosing, setIsClosing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeApp = pane.tabs.find((t) => t.id === pane.activeTabId)?.app ?? pane.tabs[0]!.app;

  const finishClose = () => {
    if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    dispatch({ type: "closePane", paneId: pane.id });
  };

  const requestClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    fallbackTimer.current = setTimeout(finishClose, CLOSE_FALLBACK_MS + 100);
  };

  const closeTab = (tabId: string) => {
    if (pane.tabs.length === 1) requestClose();
    else dispatch({ type: "closeTab", paneId: pane.id, tabId });
  };

  const openMenu = (button: HTMLButtonElement) => {
    const menu = menuRef.current;
    if (!menu) return;
    const rect = button.getBoundingClientRect();
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.left = `${rect.left}px`;
    menu.showPopover();
    menu.querySelector("button")?.focus();
  };

  const openApp = (app: AppId) => {
    menuRef.current?.hidePopover();
    dispatch({ type: "openInPane", paneId: pane.id, app });
  };

  return (
    <section
      aria-label={`${getApp(activeApp).label} window`}
      data-closing={isClosing || undefined}
      onAnimationEnd={(event) => {
        if (isClosing && event.target === event.currentTarget) finishClose();
      }}
      onPointerDownCapture={() => {
        if (!isFocused) dispatch({ type: "focusPane", paneId: pane.id });
      }}
      className={cx(
        "vt-window flex h-full min-w-0 flex-col overflow-hidden rounded-xl border bg-surface shadow-overlay",
        isFocused ? "border-line-strong" : "border-line",
      )}
    >
      <div className="flex h-11 shrink-0 items-center gap-1 border-b border-line pr-1 pl-2">
        <div role="group" aria-label="Open tabs" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {pane.tabs.map((tab) => {
            const { label, icon: Icon } = getApp(tab.app);
            const isActive = tab.id === pane.activeTabId;
            return (
              <div
                key={tab.id}
                className={cx(
                  "group flex h-8 max-w-48 shrink-0 items-center rounded-lg transition-colors duration-150 ease-out-soft",
                  isActive ? "bg-surface-selected text-ink" : "text-ink-muted hover:bg-surface-hover hover:text-ink",
                )}
              >
                <button
                  type="button"
                  aria-current={isActive ? "true" : undefined}
                  onClick={() => dispatch({ type: "focusTab", paneId: pane.id, tabId: tab.id })}
                  className="flex h-8 min-w-0 items-center gap-2 pr-1 pl-2 text-sm font-medium"
                >
                  <Icon className="size-4" />
                  <span className="truncate">{label}</span>
                </button>
                <button
                  type="button"
                  aria-label={`Close ${label} tab`}
                  onClick={() => closeTab(tab.id)}
                  className="mr-1 flex size-6 items-center justify-center rounded-md text-ink-subtle transition-colors duration-150 hover:bg-surface-hover hover:text-ink"
                >
                  <CloseIcon className="size-3.5" />
                </button>
              </div>
            );
          })}
          <button
            type="button"
            aria-label="Open an app in this window"
            onClick={(event) => openMenu(event.currentTarget)}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors duration-150 hover:bg-surface-hover hover:text-ink"
          >
            <PlusIcon className="size-4" />
          </button>
        </div>
        <button
          type="button"
          aria-label="Close window"
          onClick={requestClose}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors duration-150 hover:bg-surface-hover hover:text-ink"
        >
          <CloseIcon className="size-4" />
        </button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto">
        {pane.tabs.map((tab) => (
          // Inactive tabs stay mounted so editors keep their state; `hidden` removes them from view and the a11y tree.
          <div key={tab.id} hidden={tab.id !== pane.activeTabId} className="h-full">
            <AppContent app={tab.app} />
          </div>
        ))}
      </div>

      <div
        ref={menuRef}
        popover="auto"
        aria-label="Open an app"
        className="fixed inset-auto m-0 w-56 rounded-xl border border-line bg-surface-raised p-1.5 text-ink shadow-overlay"
      >
        {APPS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => openApp(id)}
            className="flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-sm font-medium transition-colors duration-150 hover:bg-surface-hover focus-visible:bg-surface-hover"
          >
            <Icon className="size-4 text-ink-muted" />
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}
