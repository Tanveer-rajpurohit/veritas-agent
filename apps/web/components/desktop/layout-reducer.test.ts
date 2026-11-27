import { describe, expect, it } from "vitest";
import { desktopLayout, EMPTY_LAYOUT, type DesktopLayout } from "@veritas/shared";
import { focusedApp, layoutReducer, openApps, type LayoutAction } from "./layout-reducer";

const run = (actions: LayoutAction[], start: DesktopLayout = EMPTY_LAYOUT) => {
  const result = actions.reduce(layoutReducer, start);
  // Every state the reducer produces must pass the API's own validation.
  expect(desktopLayout.safeParse(result).success).toBe(true);
  return result;
};

describe("layoutReducer", () => {
  it("opens the first app in a new window", () => {
    const layout = run([{ type: "open", app: "docs" }]);
    expect(layout.panes).toHaveLength(1);
    expect(focusedApp(layout)).toBe("docs");
  });

  it("adds tabs to the focused window and refocuses an app that is already open", () => {
    const layout = run([
      { type: "open", app: "docs" },
      { type: "open", app: "sheets" },
      { type: "open", app: "docs" },
    ]);
    expect(layout.panes).toHaveLength(1);
    expect(layout.panes[0]!.tabs.map((t) => t.app)).toEqual(["docs", "sheets"]);
    expect(focusedApp(layout)).toBe("docs");
  });

  it("opens an app beside the current window and focuses it", () => {
    const layout = run([
      { type: "open", app: "docs" },
      { type: "open", app: "agent", beside: true },
    ]);
    expect(layout.panes.map((p) => p.tabs.map((t) => t.app))).toEqual([["docs"], ["agent"]]);
    expect(focusedApp(layout)).toBe("agent");
  });

  it("moves a tab into a new pane when opened beside from the same window", () => {
    const layout = run([
      { type: "open", app: "docs" },
      { type: "open", app: "agent" },
      { type: "open", app: "agent", beside: true },
    ]);
    expect(layout.panes.map((p) => p.tabs.map((t) => t.app))).toEqual([["docs"], ["agent"]]);
  });

  it("never opens more than two panes", () => {
    const layout = run([
      { type: "open", app: "docs" },
      { type: "open", app: "agent", beside: true },
      { type: "focusPane", paneId: "unknown" },
      { type: "open", app: "mail", beside: true },
    ]);
    expect(layout.panes).toHaveLength(2);
    expect(openApps(layout)).toEqual(new Set(["docs", "agent", "mail"]));
  });

  it("closing the last tab closes the window and moves focus to the other one", () => {
    const opened = run([
      { type: "open", app: "docs" },
      { type: "open", app: "agent", beside: true },
    ]);
    const agentPane = opened.panes[1]!;
    const layout = run([{ type: "closeTab", paneId: agentPane.id, tabId: agentPane.activeTabId }], opened);
    expect(layout.panes).toHaveLength(1);
    expect(focusedApp(layout)).toBe("docs");
  });

  it("activates the neighbouring tab when the active one closes", () => {
    const opened = run([
      { type: "open", app: "docs" },
      { type: "open", app: "sheets" },
      { type: "open", app: "slides" },
    ]);
    const pane = opened.panes[0]!;
    const layout = run([{ type: "closeTab", paneId: pane.id, tabId: pane.activeTabId }], opened);
    expect(focusedApp(layout)).toBe("sheets");
  });

  it("clamps the split", () => {
    expect(run([{ type: "setSplit", split: 0.99 }]).split).toBe(0.85);
    expect(run([{ type: "setSplit", split: 0 }]).split).toBe(0.15);
  });
});
