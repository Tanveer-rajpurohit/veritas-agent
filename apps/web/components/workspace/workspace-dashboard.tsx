"use client";

import type { Matter } from "../../types/workspace";
import { ActionCards } from "./action-cards";
import { MatterTable } from "./matter-table";
import {
  CreateMatterIllustration,
  PlusIcon,
} from "./workspace-icons";

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

      {matters.length === 0 ? (
        <section className="flex min-h-[420px] flex-1 items-center justify-center rounded-xl border border-dashed border-[#b9d1e5] bg-[#f8fbfe] px-6 py-14 text-center">
          <div className="flex max-w-md flex-col items-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#cbe0f2] bg-white shadow-sm overflow-hidden p-1">
              <CreateMatterIllustration size={48} />
            </span>
            <h2 className="m-0 pt-5 font-display text-xl font-semibold text-stone-950">
              Start your first matter
            </h2>
            <p className="m-0 max-w-sm pt-2 text-sm leading-6 text-stone-500">
              Create a private matter workspace, then add the records Veritas
              will use for drafting and verification.
            </p>
            <div className="pt-6">
              <button
                type="button"
                onClick={onOpenCreateMatter}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#487aa8] px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#3b668e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#487aa8] focus-visible:ring-offset-2"
              >
                <PlusIcon size={14} />
                Create matter
              </button>
            </div>
          </div>
        </section>
      ) : (
        <>
          <div className="pb-7">
            <ActionCards
              onOpenCreateMatter={onOpenCreateMatter}
              onOpenUpload={onOpenUpload}
            />
          </div>
          <MatterTable
            matters={matters}
            onSelectMatter={onSelectMatter}
            onDeleteMatter={onDeleteMatter}
          />
        </>
      )}
    </div>
  );
}
