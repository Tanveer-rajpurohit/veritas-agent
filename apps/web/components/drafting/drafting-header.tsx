"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import type { DraftVersion } from "../../types/draft/types";
import {
  ArrowUpIcon,
  CheckIcon,
  ChevronDownIcon,
  DownloadIcon,
  LayersIcon,
} from "../workspace/workspace-icons";
import {
  WordDocIcon,
  PdfDocIcon,
  MarkdownDocIcon,
} from "./file-type-icons";

interface DraftingHeaderProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  currentVersion: string;
  versions: DraftVersion[];
  onVersionChange: (version: string) => void;
  status: "saved" | "unsaved" | "saving";
  onBack: () => void;
  onExportDocx: () => void;
  onPrintPdf: () => void;
  onExportMarkdown: () => void;
}

export function DraftingHeader({
  title,
  onTitleChange,
  currentVersion,
  versions,
  onVersionChange,
  status,
  onBack,
  onExportDocx,
  onPrintPdf,
  onExportMarkdown,
}: DraftingHeaderProps) {
  const [versionMenuOpen, setVersionMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (tempTitle.trim()) {
      onTitleChange(tempTitle.trim());
    } else {
      setTempTitle(title);
    }
  };

  const activeVersion =
    versions.find((v) => v.version === currentVersion) || versions[0];

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-[#cbe0f2] bg-white px-4 text-stone-800 shadow-xs z-40 relative">
      {/* Left section: Back + Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onBack}
          className="flex h-7 items-center gap-1.5 rounded-md border border-[#cbe0f2] bg-white px-2.5 text-xs font-medium text-stone-700 hover:bg-[#edf4fa] hover:text-[#2c5478] transition-colors cursor-pointer"
        >
          <span className="rotate-[-90deg] inline-block">
            <ArrowUpIcon size={12} />
          </span>
          <span>Back</span>
        </button>

        <div className="h-4 w-px bg-stone-200" />

        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#edf4fa] text-[#487aa8] border border-[#cbe0f2]">
            <FileText className="h-3.5 w-3.5" />
          </span>

          {isEditingTitle ? (
            <input
              type="text"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleSubmit();
                if (e.key === "Escape") {
                  setIsEditingTitle(false);
                  setTempTitle(title);
                }
              }}
              autoFocus
              className="h-7 w-80 rounded border border-[#487aa8] px-2 text-xs font-semibold text-stone-900 outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setTempTitle(title);
                setIsEditingTitle(true);
              }}
              title="Click to rename document"
              className="text-left text-xs font-semibold text-stone-900 hover:text-[#2c5478] truncate max-w-md cursor-pointer group flex items-center gap-1.5"
            >
              <span className="truncate">{title}</span>
              <span className="text-[10px] text-stone-400 opacity-0 group-hover:opacity-100 font-normal">
                (rename)
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Right section: Version + Status + Export */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Version dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setVersionMenuOpen(!versionMenuOpen)}
            className="flex h-7 items-center gap-1.5 rounded-md border border-[#cbe0f2] bg-white px-2.5 text-xs font-medium text-stone-700 hover:bg-[#f7fbfe] transition-colors cursor-pointer"
          >
            <LayersIcon size={12} className="text-[#487aa8]" />
            <span className="font-mono text-[11px]">
              {activeVersion?.version.toUpperCase() || "V3"}
            </span>
            <ChevronDownIcon size={10} className="text-stone-400 ml-0.5" />
          </button>

          {versionMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 rounded-md border border-[#cbe0f2] bg-white p-1 shadow-lg z-50">
              <div className="px-2.5 py-1 text-[10px] font-mono uppercase font-semibold text-stone-400">
                Document Versions
              </div>
              {versions.map((v) => (
                <button
                  key={v.version}
                  type="button"
                  onClick={() => {
                    onVersionChange(v.version);
                    setVersionMenuOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                    v.version === currentVersion
                      ? "bg-[#edf4fa] text-[#2c5478] font-medium"
                      : "hover:bg-stone-50 text-stone-700"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="truncate font-medium">{v.label}</div>
                    <div className="text-[10px] text-stone-400">{v.date}</div>
                  </div>
                  {v.version === currentVersion && (
                    <CheckIcon size={13} className="text-[#487aa8] shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-1.5 px-2 text-[11px] font-mono text-stone-500">
          {status === "saving" && (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-[#487aa8] animate-pulse" />
              <span>Saving...</span>
            </>
          )}
          {status === "unsaved" && (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span>Unsaved changes</span>
            </>
          )}
          {status === "saved" && (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Saved</span>
            </>
          )}
        </div>

        {/* Export dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
            className="flex h-7 items-center gap-1.5 rounded-md bg-[#487aa8] px-3 text-xs font-medium text-white hover:bg-[#38648c] transition-colors cursor-pointer shadow-xs"
          >
            <DownloadIcon size={12} />
            <span>Export</span>
            <ChevronDownIcon size={10} className="text-white/80 ml-0.5" />
          </button>

          {exportMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 rounded-lg border border-stone-200 bg-white p-1.5 shadow-xl z-50 text-xs">
              <div className="px-2.5 py-1 text-[10px] font-mono uppercase font-semibold text-stone-400">
                Export Options
              </div>
              <button
                type="button"
                onClick={() => {
                  setExportMenuOpen(false);
                  onExportDocx();
                }}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-stone-700 hover:bg-[#edf4fa] hover:text-[#2c5478] cursor-pointer transition-colors"
              >
                <WordDocIcon size={17} className="shrink-0" />
                <div className="flex flex-col">
                  <span className="font-medium text-stone-900">Word Document</span>
                  <span className="text-[10px] text-stone-400">.docx format</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setExportMenuOpen(false);
                  onPrintPdf();
                }}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-stone-700 hover:bg-[#edf4fa] hover:text-[#2c5478] cursor-pointer transition-colors"
              >
                <PdfDocIcon size={17} className="shrink-0" />
                <div className="flex flex-col">
                  <span className="font-medium text-stone-900">PDF Document</span>
                  <span className="text-[10px] text-stone-400">Vector print format</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setExportMenuOpen(false);
                  onExportMarkdown();
                }}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-stone-700 hover:bg-[#edf4fa] hover:text-[#2c5478] cursor-pointer transition-colors"
              >
                <MarkdownDocIcon size={17} className="shrink-0" />
                <div className="flex flex-col">
                  <span className="font-medium text-stone-900">Markdown</span>
                  <span className="text-[10px] text-stone-400">.md format</span>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
