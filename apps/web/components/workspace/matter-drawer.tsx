"use client";

import type { Matter } from "../../types/workspace";
import { XIcon } from "./workspace-icons";

interface MatterDrawerProps {
  matter: Matter | null;
  onClose: () => void;
}

export function MatterDrawer({ matter, onClose }: MatterDrawerProps) {
  if (!matter) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-stone-950/20 backdrop-blur-2xs">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-full w-full max-w-md flex-col justify-between border-l border-stone-200 bg-white p-6 shadow-2xl animate-in slide-in-from-right duration-200"
      >
        <div className="flex flex-col gap-5 overflow-y-auto">
          <div className="flex items-start justify-between pb-4 border-b border-stone-100">
            <div>
              <span className="inline-block rounded-sm bg-[#edf4fb] px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-[#2c5478] border border-[#cbe0f2]">
                {matter.matterType}
              </span>
              <h2 className="font-display text-xl font-normal text-stone-900 m-0 pt-2 leading-snug">
                {matter.name}
              </h2>
              <p className="text-xs text-stone-500 m-0 pt-1 font-mono">
                {matter.caseNumber} · {matter.court}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-700 cursor-pointer"
            >
              <XIcon size={14} />
            </button>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-stone-200/90 bg-stone-50/50 p-4">
            <span className="text-[11px] font-bold tracking-wider text-stone-500 uppercase font-mono">
              Parties in Dispute
            </span>
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Petitioner:</span>
                <span className="font-semibold text-stone-900">{matter.petitioner}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Respondent:</span>
                <span className="font-semibold text-stone-900">{matter.respondent}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Current Stage:</span>
                <span className="font-medium text-stone-800 bg-white px-2 py-0.5 rounded-sm border border-stone-200">
                  {matter.stage}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-[#cbe0f2] bg-[#f8fbfe] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider text-[#2c5478] uppercase font-mono">
                Veritas Forensic Checks
              </span>
              <span
                className={`rounded-sm px-2 py-0.5 text-[10px] font-semibold ${
                  matter.health === "Healthy"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : matter.health === "Needs attention"
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                {matter.health}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="rounded-md border border-stone-200/80 bg-white p-2.5 flex flex-col gap-1">
                <span className="text-[11px] text-stone-500">Verified Citations</span>
                <span className="font-display text-lg text-stone-900 font-normal">
                  {matter.citationsCount || 12}
                </span>
              </div>
              <div className="rounded-md border border-stone-200/80 bg-white p-2.5 flex flex-col gap-1">
                <span className="text-[11px] text-stone-500">Discrepancies</span>
                <span className={`font-display text-lg font-normal ${matter.discrepanciesCount ? "text-rose-600 font-semibold" : "text-emerald-700"}`}>
                  {matter.discrepanciesCount || 0}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-stone-600 m-0 leading-relaxed pt-1">
              Tested against primary Supreme Court dockets, verbatim quotation parity, and client ledger attachments.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-4 border-t border-stone-200">
          <button
            type="button"
            onClick={() => alert(`Opening ${matter.name} in brief copilot...`)}
            className="flex h-10 w-full items-center justify-center rounded-md bg-[#487aa8] text-xs font-semibold text-white shadow-xs hover:bg-[#3d6991] cursor-pointer transition-colors"
          >
            Open Brief in Copilot
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-full items-center justify-center rounded-md border border-stone-200 bg-white text-xs font-medium text-stone-700 hover:bg-stone-50 cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
