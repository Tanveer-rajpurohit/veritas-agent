import {
  AgentIcon,
  CalendarIcon,
  DocsIcon,
  FilesIcon,
  HomeIcon,
  MailIcon,
  PdfIcon,
  SettingsIcon,
  SheetsIcon,
  SlidesIcon,
} from "@veritas/ui";
import type { AppId } from "@veritas/shared";
import type { ComponentType } from "react";

export type { AppId };

/**
 * One manifest per app. The shell reads only this: adding an app means adding
 * an entry (and its window component), never touching the dock or window code.
 */
export type AppManifest = {
  id: AppId;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Home is reached from the sidebar, so it stays out of the dock. */
  isInDock: boolean;
  emptyTitle: string;
  emptyBody: string;
};

export const APPS: readonly AppManifest[] = [
  {
    id: "home",
    label: "Home",
    icon: HomeIcon,
    isInDock: false,
    emptyTitle: "",
    emptyBody: "",
  },
  {
    id: "agent",
    label: "Agent",
    icon: AgentIcon,
    isInDock: true,
    emptyTitle: "Ask Veritas anything",
    emptyBody: "The agent reads your files, drafts and edits them, and shows its work as it goes.",
  },
  {
    id: "mail",
    label: "Mail",
    icon: MailIcon,
    isInDock: true,
    emptyTitle: "Your inbox lives here",
    emptyBody: "Once you connect a Google account, your mail shows up here and the agent can read it with you.",
  },
  {
    id: "files",
    label: "Files",
    icon: FilesIcon,
    isInDock: true,
    emptyTitle: "This workspace is empty",
    emptyBody: "Every file and folder in the workspace, including your connected local folders, will appear here.",
  },
  {
    id: "calendar",
    label: "Calendar",
    icon: CalendarIcon,
    isInDock: true,
    emptyTitle: "Your calendar lives here",
    emptyBody: "Once you connect a Google account, your meetings and deadlines show up here.",
  },
  {
    id: "docs",
    label: "Docs",
    icon: DocsIcon,
    isInDock: true,
    emptyTitle: "No documents yet",
    emptyBody: "Contracts, memos and briefs you write or import will be listed here.",
  },
  {
    id: "sheets",
    label: "Sheets",
    icon: SheetsIcon,
    isInDock: true,
    emptyTitle: "No sheets yet",
    emptyBody: "Budgets, schedules and data tables you create or import will be listed here.",
  },
  {
    id: "slides",
    label: "Slides",
    icon: SlidesIcon,
    isInDock: true,
    emptyTitle: "No presentations yet",
    emptyBody: "Decks you build or import will be listed here.",
  },
  {
    id: "pdf",
    label: "PDF",
    icon: PdfIcon,
    isInDock: true,
    emptyTitle: "No PDFs yet",
    emptyBody: "PDFs you upload to read, annotate or fill in will be listed here.",
  },
  {
    id: "settings",
    label: "Settings",
    icon: SettingsIcon,
    isInDock: true,
    emptyTitle: "Workspace settings",
    emptyBody: "Members, local folders, connected accounts and models will be managed here.",
  },
];

const BY_ID = new Map(APPS.map((app) => [app.id, app]));

export function findApp(id: string): AppManifest | undefined {
  return BY_ID.get(id as AppId);
}

export function getApp(id: AppId): AppManifest {
  return BY_ID.get(id)!;
}

export const DOCK_APPS = APPS.filter((app) => app.isInDock);

/** `/w/{id}` is Home; `/w/{id}/{app}` opens that app. */
export function appHref(workspaceId: string, app: AppId): string {
  return app === "home" ? `/w/${workspaceId}` : `/w/${workspaceId}/${app}`;
}

export function appFromPath(pathname: string, workspaceId: string): AppId | null {
  const base = `/w/${workspaceId}`;
  if (pathname === base || pathname === `${base}/`) return "home";
  const segment = pathname.startsWith(`${base}/`) ? pathname.slice(base.length + 1).split("/")[0] : undefined;
  return segment ? (findApp(segment)?.id ?? null) : null;
}
