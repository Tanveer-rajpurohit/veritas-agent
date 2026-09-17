"use client";

import type { Matter } from "../../types/workspace";
import { ActionCards } from "./action-cards";
import { MatterTable } from "./matter-table";

interface WorkspaceDashboardProps {
  matters: Matter[];
  onSelectMatter: (matter: Matter) => void;
  onOpenCreateMatter: () => void;
  onOpenUpload: () => void;
  onDeleteMatter: (id: string) => void;
}

export function WorkspaceDashboard({
  matters,
  onSelectMatter,
  onOpenCreateMatter,
  onOpenUpload,
  onDeleteMatter,
}: WorkspaceDashboardProps) {
  return (
    <div className="flex h-full flex-col overflow-y-auto p-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:p-7">
      <header className="flex flex-col gap-1 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="m-0 font-sans text-2xl font-semibold tracking-tight text-stone-950 text-balance">
            Matter workspace
          </h1>
          <p className="m-0 max-w-xl pt-1.5 text-sm leading-6 text-stone-500 text-pretty">
            Open a matter to review its records, findings, and current draft.
          </p>
        </div>
        <p className="m-0 pt-2 text-xs text-stone-400 sm:pt-0">
          {matters.length} active {matters.length === 1 ? "matter" : "matters"}
        </p>
      </header>

      <div className="pb-7">
        <ActionCards
          onOpenCreateMatter={onOpenCreateMatter}
          onOpenUpload={onOpenUpload}
        />
      </div>

      <div>
        <MatterTable
          matters={matters}
          onSelectMatter={onSelectMatter}
          onDeleteMatter={onDeleteMatter}
        />
      </div>
    </div>
  );
}
