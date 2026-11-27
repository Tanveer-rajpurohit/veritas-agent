"use client";

import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import type { AppId } from "@veritas/shared";
import { SplitIcon, cx } from "@veritas/ui";
import { DOCK_APPS, getApp } from "@/lib/apps";
import { AppLink } from "../desktop/app-link";
import { useDesktop } from "../desktop/desktop-provider";
import { focusedApp, openApps } from "../desktop/layout-reducer";

type MenuState = { app: AppId; x: number; y: number } | null;

/** Icons within this many px of the pointer grow; the falloff is a quarter cosine. */
const MAGNIFY_RADIUS_PX = 140;
/** The dock lingers this long after the pointer leaves, so a slow exit doesn't flicker it away. */
const HIDE_DELAY_MS = 350;

/**
 * The app switcher along the bottom. It stays out of the way while windows are open and
 * slides up when the pointer reaches the bottom edge or focus enters it. Icons near the
 * pointer magnify. A dot marks open apps; the focused one is highlighted.
 */
export function Dock() {
  const { layout, dispatch } = useDesktop();
  const focused = focusedApp(layout);
  const open = openApps(layout);
  const [menu, setMenu] = useState<MenuState>(null);
  const [isHovered, setIsHovered] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Nothing to cover on an empty desktop, and an open menu needs its anchor.
  const isRevealed = isHovered || menu !== null || layout.panes.length === 0;

  useEffect(() => {
    if (!menu) return;
    menuRef.current?.querySelector<HTMLElement>("a, button")?.focus();
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

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    [],
  );

  const reveal = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = null;
    setIsHovered(true);
  };

  const scheduleHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setIsHovered(false), HIDE_DELAY_MS);
  };

  // Writes one CSS variable per item instead of React state, so moving the pointer never re-renders.
  const magnify = (event: PointerEvent<HTMLUListElement>) => {
    if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    for (const item of event.currentTarget.querySelectorAll<HTMLElement>("[data-dock-item]")) {
      const rect = item.getBoundingClientRect();
      const distance = Math.abs(event.clientX - (rect.left + rect.width / 2));
      const strength = distance < MAGNIFY_RADIUS_PX ? Math.cos((distance / MAGNIFY_RADIUS_PX) * (Math.PI / 2)) : 0;
      item.style.setProperty("--mag", strength.toFixed(3));
    }
  };

  const resetMagnify = () => {
    listRef.current?.querySelectorAll<HTMLElement>("[data-dock-item]").forEach((item) => item.style.setProperty("--mag", "0"));
  };

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
    <nav
      aria-label="Apps"
      data-revealed={isRevealed ? "" : undefined}
      onPointerEnter={reveal}
      onPointerLeave={scheduleHide}
      className="vt-dock pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-2 pb-3"
    >
      {/* The reveal strip along the bottom edge, with a small handle so the dock can be found. */}
      <div
        aria-hidden
        className="pointer-events-auto absolute bottom-0 left-1/2 flex h-3 w-[min(36rem,100%)] -translate-x-1/2 items-end justify-center pb-1"
      >
        <span className="vt-dock-handle h-1 w-10 rounded-full bg-ink-subtle" />
      </div>

      <ul
        ref={listRef}
        onPointerMove={magnify}
        onPointerLeave={resetMagnify}
        className="vt-dock-tray pointer-events-auto flex max-w-full items-end gap-0.5 rounded-2xl border border-line bg-surface p-1.5 shadow-overlay max-sm:overflow-x-auto"
      >
        {DOCK_APPS.map((app) => {
          const isActive = focused === app.id;
          const isOpen = open.has(app.id);
          const Icon = app.icon;
          return (
            <li key={app.id} data-dock-item className={cx("vt-dock-item", app.id === "settings" && "ml-1 border-l border-line pl-1")}>
              <AppLink
                app={app.id}
                aria-label={app.label}
                aria-current={isActive ? "page" : undefined}
                onContextMenu={(event) => onContextMenu(event, app.id)}
                className="group relative flex h-11 w-full items-center justify-center rounded-xl text-ink-muted transition-[background-color,color] duration-150 ease-out-soft hover:bg-surface-hover hover:text-ink aria-[current=page]:bg-surface-selected aria-[current=page]:text-ink"
              >
                <span className="vt-dock-icon flex items-center justify-center">
                  <Icon className="size-5.5" />
                </span>
                <span
                  aria-hidden
                  data-dock-dot
                  className={cx(
                    "absolute bottom-1 size-1 rounded-full transition-opacity duration-150",
                    isActive ? "bg-ink" : "bg-ink-subtle",
                    isOpen ? "opacity-100" : "opacity-0",
                  )}
                />
                <span
                  aria-hidden
                  data-dock-tooltip
                  className="vt-dock-tooltip pointer-events-none invisible absolute bottom-full mb-2 rounded-md bg-surface-inverted px-2 py-1 text-xs font-medium whitespace-nowrap text-ink-inverted opacity-0 shadow-overlay transition-[opacity,visibility] duration-150 ease-out-soft group-hover:visible group-hover:opacity-100 group-hover:delay-300 group-focus-visible:visible group-focus-visible:opacity-100"
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
            className="flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-sm font-medium transition-colors duration-150 hover:bg-surface-hover focus-visible:bg-surface-hover"
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
