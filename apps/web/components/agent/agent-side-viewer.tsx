"use client";

import {
  useState,
  useRef,
  useEffect,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { gsap } from "gsap";
import {
  XIcon,
  DownloadIcon,
  CheckIcon,
  ChevronDownIcon,
  LayersIcon,
} from "../workspace/workspace-icons";

export interface DraftPage {
  pageNumber: number;
  totalPdfPages: number;
  headerTitle: string;
  subHeader?: string;
  sections: Array<{
    title: string;
    content: string;
    citations?: Array<{
      title: string;
      citation: string;
      status: "Supported" | "Contradicted";
      court: string;
    }>;
  }>;
}

export interface DraftVersion {
  version: string;
  label: string;
  date: string;
  summary: string;
  pages: DraftPage[];
}

export interface SideViewerDocument {
  id: string;
  title: string;
  type: "draft" | "document";
  matterName?: string;
  court?: string;
  caseNumber?: string;
  currentVersion: string;
  versions: DraftVersion[];
}

interface AgentSideViewerProps {
  document: SideViewerDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenInEditor?: () => void;
  onResizeStart?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}

export function AgentSideViewer({
  document,
  isOpen,
  onClose,
  onOpenInEditor,
  onResizeStart,
}: AgentSideViewerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [selectedVersion, setSelectedVersion] = useState<string>("v3");
  const [prevDocId, setPrevDocId] = useState<string | null>(
    document?.id || null,
  );
  const [versionDropdownOpen, setVersionDropdownOpen] = useState(false);

  if (document && document.id !== prevDocId) {
    setPrevDocId(document.id);
    setSelectedVersion(document.currentVersion || "v3");
  }

  useEffect(() => {
    if (!panelRef.current) return;

    if (isOpen) {
      gsap.killTweensOf(panelRef.current);
      gsap.fromTo(
        panelRef.current,
        { xPercent: 100, opacity: 0.9 },
        { xPercent: 0, opacity: 1, duration: 0.28, ease: "power2.out" },
      );
    }
  }, [isOpen]);

  if (!isOpen || !document) {
    return null;
  }

  const activeVersionData =
    document.versions.find((v) => v.version === selectedVersion) ||
    document.versions[0];

  const handleDownload = () => {
    if (!activeVersionData) return;
    const textContent = activeVersionData.pages
      .map((p) => {
        const secTexts = p.sections
          .map((s) => `${s.title}\n\n${s.content}`)
          .join("\n\n");
        return `[PAGE ${p.pageNumber} OF ${p.totalPdfPages}]\n${p.headerTitle}\n\n${secTexts}`;
      })
      .join("\n\n==================================================\n\n");

    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${document.title.toLowerCase().replace(/\s+/g, "-")}-${selectedVersion}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside
      ref={panelRef}
      aria-label="Generated draft preview"
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl shrink-0 select-none flex-col overflow-hidden border-l border-[#cbe0f2] bg-[#edf4fa] md:relative md:inset-auto md:w-full md:max-w-none"
    >
      {onResizeStart && (
        <button
          type="button"
          onPointerDown={onResizeStart}
          aria-label="Resize document preview"
          title="Drag to resize"
          className="group absolute inset-y-0 left-0 z-40 hidden w-2 -translate-x-1/2 cursor-col-resize touch-none items-center justify-center md:flex"
        >
          <span className="h-12 w-0.5 rounded-full bg-[#9fc2df] opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
      )}
      <header className="flex h-11.5 shrink-0 items-center justify-between border-b border-[#cbe0f2] bg-white px-4">
        <div className="flex items-center gap-2 min-w-0">
          <strong className="text-[13px] font-medium text-stone-900 truncate">
            {document.title}
          </strong>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="relative">
            <button
              type="button"
              onClick={() => setVersionDropdownOpen(!versionDropdownOpen)}
              className="flex h-7 items-center gap-1.5 rounded-md border border-[#cbe0f2] bg-white px-2 text-[11.5px] font-medium text-stone-700 transition-colors hover:bg-[#f7fbfe]"
            >
              <LayersIcon size={12} className="text-[#487aa8]" />
              <span className="font-mono">
                {activeVersionData?.version.toUpperCase() || "V3"}
              </span>
              <ChevronDownIcon size={11} className="text-stone-400" />
            </button>

            {versionDropdownOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-md border border-[#cbe0f2] bg-white p-1 shadow-lg">
                <div className="px-2 py-1 text-[10px] font-mono uppercase text-stone-400 font-semibold">
                  Versions
                </div>
                {document.versions.map((v) => (
                  <button
                    key={v.version}
                    type="button"
                    onClick={() => {
                      setSelectedVersion(v.version);
                      setVersionDropdownOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                      v.version === selectedVersion
                        ? "bg-[#edf4fa] text-[#2c5478] font-medium"
                        : "hover:bg-stone-50 text-stone-700"
                    }`}
                  >
                    <span>{v.label}</span>
                    {v.version === selectedVersion && (
                      <CheckIcon size={12} className="text-[#487aa8]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleDownload}
            className="flex h-7 items-center gap-1 rounded-md border border-[#cbe0f2] bg-white px-2 text-[11.5px] text-stone-700 transition-colors hover:bg-[#f7fbfe]"
          >
            <DownloadIcon size={12} />
            <span>Download</span>
          </button>

          {onOpenInEditor && (
            <button
              type="button"
              onClick={onOpenInEditor}
              className="flex h-7 items-center gap-1 rounded bg-[#487aa8] px-2.5 text-[11.5px] font-medium text-white hover:bg-[#38648c] cursor-pointer transition-colors"
            >
              <span>Open in editor</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Close draft viewer"
            className="flex h-7 w-7 items-center justify-center rounded text-stone-400 hover:bg-stone-100 hover:text-stone-700 cursor-pointer transition-colors ml-0.5"
          >
            <XIcon size={14} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 [scrollbar-width:thin]">
        <div className="flex flex-col items-center gap-5 max-w-[520px] mx-auto">
          {activeVersionData?.pages.map((page) => (
            <article
              key={page.pageNumber}
              className="flex min-h-[620px] w-full flex-col justify-between rounded-sm border border-[#cbe0f2] bg-white p-7 font-serif shadow-sm md:p-8"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2.5 font-sans text-[10px] text-stone-400 font-mono tracking-wider uppercase">
                  <span>{page.headerTitle}</span>
                  <span>
                    Page {page.pageNumber} of {page.totalPdfPages}
                  </span>
                </div>

                {page.subHeader && (
                  <div className="text-center font-sans py-2 border-b border-stone-100">
                    <p className="text-[11.5px] font-bold text-stone-800 uppercase tracking-wide">
                      {page.subHeader}
                    </p>
                  </div>
                )}

                <div className="space-y-4 pt-1">
                  {page.sections.map((sec, sIdx) => (
                    <div key={sIdx} className="space-y-2">
                      <h4 className="font-sans text-[11.5px] font-bold text-stone-800 uppercase tracking-wide">
                        {sec.title}
                      </h4>
                      <p className="text-[13px] leading-[1.7] text-stone-700 whitespace-pre-line">
                        {sec.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-stone-100 pt-3 mt-6 flex items-center justify-end font-sans text-[10px] text-stone-400 font-mono">
                <span>
                  Page {page.pageNumber} of {page.totalPdfPages}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </aside>
  );
}
