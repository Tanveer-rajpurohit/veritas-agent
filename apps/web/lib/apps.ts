import { DocsIcon, FilesIcon, PdfIcon, SettingsIcon, SheetsIcon, SlidesIcon } from "@veritas/ui";
import type { ComponentType } from "react";

export type AppId = "docs" | "sheets" | "slides" | "pdf" | "files" | "agent" | "settings";

export type AppEntry = {
  id: AppId;
  label: string;
  /** Null for the agent, whose dock mark is the orb. */
  icon: ComponentType<{ className?: string }> | null;
  emptyTitle: string;
  emptyBody: string;
};

/** Dock order. Editors first, then files, then the agent and settings. */
export const APPS: readonly AppEntry[] = [
  {
    id: "docs",
    label: "Docs",
    icon: DocsIcon,
    emptyTitle: "No documents yet",
    emptyBody: "Contracts, memos and briefs you write or import will be listed here.",
  },
  {
    id: "sheets",
    label: "Sheets",
    icon: SheetsIcon,
    emptyTitle: "No sheets yet",
    emptyBody: "Budgets, schedules and data tables you create or import will be listed here.",
  },
  {
    id: "slides",
    label: "Slides",
    icon: SlidesIcon,
    emptyTitle: "No presentations yet",
    emptyBody: "Decks you build or import will be listed here.",
  },
  {
    id: "pdf",
    label: "PDF",
    icon: PdfIcon,
    emptyTitle: "No PDFs yet",
    emptyBody: "PDFs you upload to read, annotate or fill in will be listed here.",
  },
  {
    id: "files",
    label: "Files",
    icon: FilesIcon,
    emptyTitle: "This workspace is empty",
    emptyBody: "Every file and folder in the workspace, including your connected local folders, will appear here.",
  },
  {
    id: "agent",
    label: "Agent",
    icon: null,
    emptyTitle: "Ask Veritas anything",
    emptyBody: "The agent reads your files, drafts and edits them, and shows its work as it goes.",
  },
  {
    id: "settings",
    label: "Settings",
    icon: SettingsIcon,
    emptyTitle: "Workspace settings",
    emptyBody: "Members, local folders, connected accounts and models will be managed here.",
  },
];

export function findApp(id: string): AppEntry | undefined {
  return APPS.find((app) => app.id === id);
}
