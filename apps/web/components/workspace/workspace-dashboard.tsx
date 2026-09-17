"use client";

import { useMemo } from "react";
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
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, []);

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6 sm:p-7 select-none">
      <div className="pb-6">
        <h1 className="m-0 font-sans text-[22px] font-normal tracking-tight text-stone-900">
          {greeting}, Tanveer
        </h1>
        <p className="m-0 pt-1 text-xs text-stone-500 font-normal">
          {formattedDate}
        </p>
      </div>

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
