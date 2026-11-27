"use client";

import { useSyncExternalStore } from "react";
import type { DesktopSummary } from "@veritas/shared";
import { cx, SidebarIcon } from "@veritas/ui";
import { AccountMenu } from "../shell/account-menu";
import { Dock } from "../shell/dock";
import { DesktopProvider } from "./desktop-provider";
import { PromptWindow } from "./prompt-window";
import { Sidebar } from "./sidebar";
import { Stage } from "./stage";

const SIDEBAR_KEY = "veritas-sidebar-collapsed";
const SIDEBAR_EVENT = "veritas-sidebar-change";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(SIDEBAR_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(SIDEBAR_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function setCollapsed(isCollapsed: boolean) {
  try {
    localStorage.setItem(SIDEBAR_KEY, isCollapsed ? "1" : "0");
  } catch {
    // Storage blocked: the choice still applies until reload.
  }
  window.dispatchEvent(new Event(SIDEBAR_EVENT));
}

type Props = {
  workspaceId: string;
  workspaceName: string;
  user: { name: string; email: string };
  desktops: DesktopSummary[];
  currentDesktopId: string;
};

export function DesktopShell({ workspaceId, workspaceName, user, desktops, currentDesktopId }: Props) {
  const isCollapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);

  return (
    <DesktopProvider
      workspaceId={workspaceId}
      workspaceName={workspaceName}
      initialDesktops={desktops}
      initialDesktopId={currentDesktopId}
    >
      <div className="vt-wallpaper flex h-dvh overflow-hidden">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-surface-inverted focus:px-4 focus:py-2 focus:text-sm focus:text-ink-inverted"
        >
          Skip to content
        </a>
        {isCollapsed ? null : <Sidebar user={user} onCollapse={() => setCollapsed(true)} />}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* With the sidebar open on wide screens it holds the account, so the bar is not needed. */}
          <header className={cx("flex h-12 shrink-0 items-center justify-between gap-2 pr-1 pl-2", !isCollapsed && "lg:hidden")}>
            {isCollapsed ? (
              <button
                type="button"
                aria-label="Expand sidebar"
                aria-expanded="false"
                onClick={() => setCollapsed(false)}
                className="flex size-9 items-center justify-center rounded-lg text-ink-muted transition-colors duration-150 hover:bg-surface/70 hover:text-ink max-lg:hidden"
              >
                <SidebarIcon className="size-5" />
              </button>
            ) : (
              <span />
            )}
            <AccountMenu name={user.name} email={user.email} />
          </header>
          {/* The dock hides while windows are open, so windows run to the bottom; touch screens keep it in view. */}
          <main id="main" className={cx("min-h-0 flex-1 px-2 pb-2 sm:pr-3 [@media(hover:none)]:pb-22", !isCollapsed && "lg:pt-2")}>
            <Stage />
          </main>
        </div>
        <Dock />
        <PromptWindow />
      </div>
    </DesktopProvider>
  );
}
