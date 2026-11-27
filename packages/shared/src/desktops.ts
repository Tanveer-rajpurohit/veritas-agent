import { z } from "zod";

/** Every app that can live in a window. The dock order comes from the web app registry. */
export const APP_IDS = ["home", "agent", "mail", "files", "calendar", "docs", "sheets", "slides", "pdf", "settings"] as const;
export const appId = z.enum(APP_IDS);
export type AppId = z.infer<typeof appId>;

export const DESKTOP_NAME_MAX = 40;
export const MAX_PANES = 2;
export const MAX_TABS_PER_PANE = 20;
/** Fraction of the stage the first pane takes in split view. */
export const SPLIT_MIN = 0.15;
export const SPLIT_MAX = 0.85;

const clientId = z.string().min(1).max(64);

export const windowTab = z.object({
  id: clientId,
  app: appId,
  fileId: z.uuid().optional(),
});
export type WindowTab = z.infer<typeof windowTab>;

export const windowPane = z
  .object({
    id: clientId,
    tabs: z.array(windowTab).min(1).max(MAX_TABS_PER_PANE),
    activeTabId: clientId,
  })
  .refine((pane) => pane.tabs.some((tab) => tab.id === pane.activeTabId), {
    message: "activeTabId must name one of the pane's tabs",
    path: ["activeTabId"],
  });
export type WindowPane = z.infer<typeof windowPane>;

export const desktopLayout = z.object({
  panes: z.array(windowPane).max(MAX_PANES),
  split: z.number().min(SPLIT_MIN).max(SPLIT_MAX),
  focusedPaneId: clientId.nullable(),
});
export type DesktopLayout = z.infer<typeof desktopLayout>;

export const EMPTY_LAYOUT: DesktopLayout = { panes: [], split: 0.5, focusedPaneId: null };

const desktopName = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(DESKTOP_NAME_MAX, `Use ${DESKTOP_NAME_MAX} characters or fewer`);

export const desktopSummary = z.object({
  id: z.uuid(),
  name: z.string(),
  position: z.number().int(),
  layout: desktopLayout,
  updatedAt: z.iso.datetime(),
});
export type DesktopSummary = z.infer<typeof desktopSummary>;

export const desktopList = z.object({ desktops: z.array(desktopSummary) });

export const createDesktopInput = z.object({ name: desktopName });

export const updateDesktopInput = z
  .object({ name: desktopName.optional(), layout: desktopLayout.optional() })
  .refine((input) => input.name !== undefined || input.layout !== undefined, { message: "Nothing to update" });
export type UpdateDesktopInput = z.infer<typeof updateDesktopInput>;
