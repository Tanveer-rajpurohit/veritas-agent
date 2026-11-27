import {
  MAX_PANES,
  MAX_TABS_PER_PANE,
  SPLIT_MAX,
  SPLIT_MIN,
  type AppId,
  type DesktopLayout,
  type WindowPane,
  type WindowTab,
} from "@veritas/shared";

export type LayoutAction =
  | { type: "open"; app: AppId; beside?: boolean }
  | { type: "openInPane"; paneId: string; app: AppId }
  | { type: "focusTab"; paneId: string; tabId: string }
  | { type: "focusPane"; paneId: string }
  | { type: "closeTab"; paneId: string; tabId: string }
  | { type: "closePane"; paneId: string }
  | { type: "setSplit"; split: number }
  | { type: "replace"; layout: DesktopLayout };

const shortId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

const newTab = (app: AppId): WindowTab => ({ id: shortId("tab"), app });

const newPane = (app: AppId): WindowPane => {
  const tab = newTab(app);
  return { id: shortId("pane"), tabs: [tab], activeTabId: tab.id };
};

export function focusedPane(layout: DesktopLayout): WindowPane | undefined {
  return layout.panes.find((p) => p.id === layout.focusedPaneId) ?? layout.panes[0];
}

export function activeTab(pane: WindowPane | undefined): WindowTab | undefined {
  return pane?.tabs.find((t) => t.id === pane.activeTabId);
}

export function focusedApp(layout: DesktopLayout): AppId | null {
  return activeTab(focusedPane(layout))?.app ?? null;
}

export function openApps(layout: DesktopLayout): Set<AppId> {
  return new Set(layout.panes.flatMap((p) => p.tabs.map((t) => t.app)));
}

/** Focuses the app's tab in this pane, or adds one (reusing the active tab when the pane is full). */
function showInPane(pane: WindowPane, app: AppId): WindowPane {
  const existing = pane.tabs.find((t) => t.app === app);
  if (existing) return { ...pane, activeTabId: existing.id };
  if (pane.tabs.length >= MAX_TABS_PER_PANE) {
    return { ...pane, tabs: pane.tabs.map((t) => (t.id === pane.activeTabId ? { ...t, app } : t)) };
  }
  const tab = newTab(app);
  return { ...pane, tabs: [...pane.tabs, tab], activeTabId: tab.id };
}

function withoutTab(pane: WindowPane, tabId: string): WindowPane | null {
  const index = pane.tabs.findIndex((t) => t.id === tabId);
  if (index === -1) return pane;
  const tabs = pane.tabs.filter((t) => t.id !== tabId);
  if (tabs.length === 0) return null;
  const activeTabId = pane.activeTabId === tabId ? tabs[Math.max(0, index - 1)]!.id : pane.activeTabId;
  return { ...pane, tabs, activeTabId };
}

function removePane(layout: DesktopLayout, paneId: string): DesktopLayout {
  const panes = layout.panes.filter((p) => p.id !== paneId);
  const focusedPaneId = panes.some((p) => p.id === layout.focusedPaneId) ? layout.focusedPaneId : (panes[0]?.id ?? null);
  return { ...layout, panes, focusedPaneId };
}

function replacePane(layout: DesktopLayout, pane: WindowPane): DesktopLayout {
  return { ...layout, panes: layout.panes.map((p) => (p.id === pane.id ? pane : p)), focusedPaneId: pane.id };
}

function open(layout: DesktopLayout, app: AppId, beside: boolean): DesktopLayout {
  const owner = layout.panes.find((p) => p.tabs.some((t) => t.app === app));
  const focused = focusedPane(layout);

  if (!focused) {
    const pane = newPane(app);
    return { ...layout, panes: [pane], focusedPaneId: pane.id };
  }

  if (!beside) {
    return replacePane(layout, showInPane(owner ?? focused, app));
  }

  // Beside: the app goes into the pane next to the focused one.
  const other = layout.panes.find((p) => p.id !== focused.id);
  if (other) {
    let next = layout;
    if (owner && owner.id !== other.id) {
      const tab = owner.tabs.find((t) => t.app === app)!;
      const remaining = withoutTab(owner, tab.id);
      next = remaining ? replacePane(next, remaining) : removePane(next, owner.id);
      if (!remaining) {
        // The app was the focused pane's only tab, so it simply stays where it is.
        return replacePane(next, showInPane(other, app));
      }
    }
    return replacePane(next, showInPane(other, app));
  }

  if (layout.panes.length >= MAX_PANES) return replacePane(layout, showInPane(focused, app));

  // One pane open: move the app out of it if it was there, then open a second pane.
  let next = layout;
  if (owner) {
    const tab = owner.tabs.find((t) => t.app === app)!;
    const remaining = withoutTab(owner, tab.id);
    if (!remaining) return replacePane(layout, owner);
    next = { ...next, panes: next.panes.map((p) => (p.id === owner.id ? remaining : p)) };
  }
  const pane = newPane(app);
  return { ...next, panes: [...next.panes, pane], focusedPaneId: pane.id };
}

export function layoutReducer(layout: DesktopLayout, action: LayoutAction): DesktopLayout {
  switch (action.type) {
    case "open":
      return open(layout, action.app, action.beside ?? false);
    case "openInPane": {
      const pane = layout.panes.find((p) => p.id === action.paneId);
      return pane ? replacePane(layout, showInPane(pane, action.app)) : layout;
    }
    case "focusTab": {
      const pane = layout.panes.find((p) => p.id === action.paneId);
      if (!pane?.tabs.some((t) => t.id === action.tabId)) return layout;
      return replacePane(layout, { ...pane, activeTabId: action.tabId });
    }
    case "focusPane":
      return layout.panes.some((p) => p.id === action.paneId) ? { ...layout, focusedPaneId: action.paneId } : layout;
    case "closeTab": {
      const pane = layout.panes.find((p) => p.id === action.paneId);
      if (!pane) return layout;
      const remaining = withoutTab(pane, action.tabId);
      return remaining ? replacePane(layout, remaining) : removePane(layout, pane.id);
    }
    case "closePane":
      return removePane(layout, action.paneId);
    case "setSplit":
      return { ...layout, split: Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, action.split)) };
    case "replace":
      return action.layout;
  }
}
