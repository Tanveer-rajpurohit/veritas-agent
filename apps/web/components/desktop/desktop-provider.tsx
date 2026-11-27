"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import type { DesktopLayout, DesktopSummary } from "@veritas/shared";
import { apiFetch } from "@/lib/api-client";
import { appFromPath, appHref } from "@/lib/apps";
import { desktopCookieName } from "./desktop-cookie";
import { focusedApp, layoutReducer, type LayoutAction } from "./layout-reducer";

const SAVE_DELAY_MS = 400;

type CreateResult = { ok: true } | { ok: false; error: string };

type DesktopContextValue = {
  workspaceId: string;
  workspaceName: string;
  desktops: DesktopSummary[];
  currentDesktopId: string;
  layout: DesktopLayout;
  dispatch: (action: LayoutAction) => void;
  selectDesktop: (desktopId: string) => void;
  createDesktop: (name: string) => Promise<CreateResult>;
};

const DesktopContext = createContext<DesktopContextValue | null>(null);

export function useDesktop(): DesktopContextValue {
  const value = useContext(DesktopContext);
  if (!value) throw new Error("useDesktop must be used inside DesktopProvider");
  return value;
}

type Props = {
  workspaceId: string;
  workspaceName: string;
  initialDesktops: DesktopSummary[];
  initialDesktopId: string;
  children: ReactNode;
};

export function DesktopProvider({ workspaceId, workspaceName, initialDesktops, initialDesktopId, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [desktops, setDesktops] = useState(initialDesktops);
  const [currentDesktopId, setCurrentDesktopId] = useState(initialDesktopId);
  const [layout, rawDispatch] = useReducer(
    layoutReducer,
    initialDesktops.find((d) => d.id === initialDesktopId)?.layout ?? initialDesktops[0]!.layout,
  );

  // ---- Persistence: debounced PATCH of the current desktop's layout ----
  const pendingSave = useRef<{ desktopId: string; layout: DesktopLayout } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    const pending = pendingSave.current;
    pendingSave.current = null;
    if (!pending) return;
    void apiFetch(`/api/v1/workspaces/${workspaceId}/desktops/${pending.desktopId}`, {
      method: "PATCH",
      body: { layout: pending.layout },
      // The flush on pagehide must survive a reload or tab close.
      keepalive: true,
    });
  }, [workspaceId]);

  const isDirty = useRef(false);
  const dispatch = useCallback((action: LayoutAction) => {
    if (action.type !== "replace") isDirty.current = true;
    rawDispatch(action);
  }, []);

  useEffect(() => {
    if (!isDirty.current) return;
    isDirty.current = false;
    pendingSave.current = { desktopId: currentDesktopId, layout };
    setDesktops((list) => list.map((d) => (d.id === currentDesktopId ? { ...d, layout } : d)));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushSave, SAVE_DELAY_MS);
  }, [layout, currentDesktopId, flushSave]);

  useEffect(() => {
    // Leaving the page must not drop the last change.
    window.addEventListener("pagehide", flushSave);
    return () => {
      window.removeEventListener("pagehide", flushSave);
      flushSave();
    };
  }, [flushSave]);

  // ---- Desktops ----
  const rememberDesktop = useCallback(
    (desktopId: string) => {
      document.cookie = `${desktopCookieName(workspaceId)}=${desktopId}; path=/; max-age=31536000; samesite=lax`;
    },
    [workspaceId],
  );

  const selectDesktop = useCallback(
    (desktopId: string) => {
      if (desktopId === currentDesktopId) return;
      const target = desktops.find((d) => d.id === desktopId);
      if (!target) return;
      flushSave();
      setCurrentDesktopId(desktopId);
      rememberDesktop(desktopId);
      rawDispatch({ type: "replace", layout: target.layout });
    },
    [currentDesktopId, desktops, flushSave, rememberDesktop],
  );

  const createDesktop = useCallback(
    async (name: string): Promise<CreateResult> => {
      const result = await apiFetch<DesktopSummary>(`/api/v1/workspaces/${workspaceId}/desktops`, { method: "POST", body: { name } });
      if (!result.ok) return { ok: false, error: result.error.fields?.name ?? result.error.error };
      flushSave();
      setDesktops((list) => [...list, result.data]);
      setCurrentDesktopId(result.data.id);
      rememberDesktop(result.data.id);
      rawDispatch({ type: "replace", layout: result.data.layout });
      return { ok: true };
    },
    [workspaceId, flushSave, rememberDesktop],
  );

  // ---- URL sync: /w/{id}/{app} names the focused app ----
  const current = focusedApp(layout);
  const currentRef = useRef(current);
  // Declared before the URL effects, so they always read this render's value.
  useEffect(() => {
    currentRef.current = current;
  }, [current]);
  // The layout owns the URL. The URL only drives the layout on first load (deep links)
  // and on back/forward; in-app links dispatch directly (AppLink). Reacting to every
  // pathname change instead races our own router.replace calls when two land close together.
  const isHistoryNavigation = useRef(false);
  useEffect(() => {
    const onPopState = () => {
      isHistoryNavigation.current = true;
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  // Both sync effects remember what they last handled, so running twice
  // (React Strict Mode in development) never acts twice.
  const lastHandledPath = useRef<string | null>(null);
  const lastSyncedApp = useRef(current);

  const navigateTo = useCallback(
    (href: string) => {
      router.replace(href, { scroll: false });
    },
    [router],
  );

  // URL -> layout: deep links and the back button open the named app.
  useEffect(() => {
    if (lastHandledPath.current === pathname) return;
    const isInitialPath = lastHandledPath.current === null;
    lastHandledPath.current = pathname;
    if (!isInitialPath && !isHistoryNavigation.current) return;
    isHistoryNavigation.current = false;
    const urlApp = appFromPath(pathname, workspaceId);
    if (!urlApp) return;
    if (isInitialPath && urlApp === "home") {
      // The bare workspace URL on load keeps the saved layout and just reflects it.
      const focused = currentRef.current;
      if (focused && focused !== "home") navigateTo(appHref(workspaceId, focused));
      return;
    }
    if (urlApp !== currentRef.current) dispatch({ type: "open", app: urlApp });
  }, [pathname, workspaceId, dispatch, navigateTo]);

  // Layout -> URL: focusing a tab, closing windows or switching desktops updates the address.
  useEffect(() => {
    if (lastSyncedApp.current === current) return;
    lastSyncedApp.current = current;
    const target = current ? appHref(workspaceId, current) : `/w/${workspaceId}`;
    if (target !== pathname) navigateTo(target);
    // pathname is read, not watched: only layout changes should move the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, workspaceId, navigateTo]);

  const value = useMemo<DesktopContextValue>(
    () => ({ workspaceId, workspaceName, desktops, currentDesktopId, layout, dispatch, selectDesktop, createDesktop }),
    [workspaceId, workspaceName, desktops, currentDesktopId, layout, dispatch, selectDesktop, createDesktop],
  );

  return <DesktopContext.Provider value={value}>{children}</DesktopContext.Provider>;
}
