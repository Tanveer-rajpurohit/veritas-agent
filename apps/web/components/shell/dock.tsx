"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { AppId } from "@veritas/shared";
import { SplitIcon, cx } from "@veritas/ui";
import { DOCK_APPS, getApp } from "@/lib/apps";
import { AppLink } from "../desktop/app-link";
import { useDesktop } from "../desktop/desktop-provider";
import { focusedApp, openApps } from "../desktop/layout-reducer";

type MenuState = { app: AppId; x: number; y: number } | null;

/** The app switcher along the bottom. A dot marks open apps; the focused one is highlighted. */
export function Dock() {
  const { layout, dispatch } = useDesktop();
  const focused = focusedApp(layout);
  const open = openApps(layout);
  const [menu, setMenu] = useState<MenuState>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    menuRef.current?.querySelector("button")?.focus();
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (event.type === "pointerdown" && menuRef.current?.contains(event.target as Node)) return;
      setMenu(null);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", close);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", close);
      window.removeEventListener("resize", close);
    };
  }, [menu]);

  const onContextMenu = (event: MouseEvent<HTMLAnchorElement>, app: AppId) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    // Keyboard context-menu keys report 0,0: anchor to the icon instead.
    const x = event.clientX || rect.left;
    const y = event.clientY || rect.top;
    setMenu({ app, x, y });
  };

  const openBeside = (app: AppId) => {
    setMenu(null);
    dispatch({ type: "open", app, beside: true });
  };

  return (
    <nav aria-label="Apps" className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-2 pb-3">
      <ul className="pointer-events-auto flex max-w-full items-center gap-0.5 rounded-2xl max-sm:overflow-x-auto border border-line bg-surface p-1.5 shadow-overlay">
        {DOCK_APPS.map((app) => {
          const isActive = focused === app.id;
          const isOpen = open.has(app.id);
          const Icon = app.icon;
          return (
            <li key={app.id} className={app.id === "settings" ? "ml-1 border-l border-line pl-1" : undefined}>
              <AppLink
                app={app.id}
                aria-label={app.label}
                aria-current={isActive ? "page" : undefined}
                onContextMenu={(event) => onContextMenu(event, app.id)}
                className="group relative flex size-11 items-center justify-center rounded-xl text-ink-muted transition-[background-color,color,transform] duration-150 ease-out-soft hover:bg-surface-hover hover:text-ink active:scale-[0.96] aria-[current=page]:bg-surface-selected aria-[current=page]:text-ink"
              >
                <Icon className="size-5.5" />
                <span
                  aria-hidden
                  className={cx(
                    "absolute bottom-1 size-1 rounded-full transition-opacity duration-150",
                    isActive ? "bg-ink" : "bg-ink-subtle",
                    isOpen ? "opacity-100" : "opacity-0",
                  )}
                />
                <span
                  aria-hidden
                  data-dock-tooltip
                  className="pointer-events-none invisible absolute bottom-full mb-2 translate-y-1 rounded-md bg-surface-inverted px-2 py-1 text-xs font-medium whitespace-nowrap text-ink-inverted opacity-0 shadow-overlay transition-[opacity,transform,visibility] duration-150 ease-out-soft group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-hover:delay-300 group-focus-visible:visible group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
                >
                  {app.label}
                </span>
              </AppLink>
            </li>
          );
        })}
      </ul>

      {menu ? (
        <div
          ref={menuRef}
          aria-label={`${getApp(menu.app).label} options`}
          style={{ left: menu.x, bottom: `calc(100vh - ${menu.y}px + 8px)` }}
          className="pointer-events-auto fixed w-52 rounded-xl border border-line bg-surface-raised p-1.5 text-ink shadow-overlay"
        >
          <AppLink
            app={menu.app}
            onClick={() => setMenu(null)}
            className="flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-sm font-medium transition-colors duration-150 hover:bg-surface-hover"
          >
            Open
          </AppLink>
          <button
            type="button"
            onClick={() => openBeside(menu.app)}
            className="flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-sm font-medium transition-colors duration-150 hover:bg-surface-hover focus-visible:bg-surface-hover"
          >
            <SplitIcon className="size-4 text-ink-muted" />
            Open beside
          </button>
        </div>
      ) : null}
    </nav>
  );
}
