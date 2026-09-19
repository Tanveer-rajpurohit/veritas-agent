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
import type {
  DraftDocument,
  DraftPage,
  DraftVersion,
} from "../../types/draft/types";
import {
  exportAsMarkdown,
  printDocument,
} from "../../lib/draft/export-document";
import { draftToTipTapHtml } from "../../lib/draft/draft-data";
import {
  WordDocIcon,
  PdfDocIcon,
  MarkdownDocIcon,
} from "../drafting/file-type-icons";
import { useCreateExport } from "../../hooks/exports/useExports";
import { exportService } from "../../service/exports/exportService";

export type { DraftPage, DraftVersion };
export type SideViewerDocument = DraftDocument;

interface AgentSideViewerProps {
  document: SideViewerDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenInEditor?: () => void;
  onResizeStart?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}

const BASE_A4_WIDTH = 794;
const BASE_A4_HEIGHT = 1123;

export function AgentSideViewer({
  document,
  isOpen,
  onClose,
  onOpenInEditor,
  onResizeStart,
}: AgentSideViewerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedVersion, setSelectedVersion] = useState<string>("v3");
  const [prevDocId, setPrevDocId] = useState<string | null>(
    document?.id || null,
  );
  const [versionDropdownOpen, setVersionDropdownOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [scale, setScale] = useState<number>(0.65);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);
  const createExportMutation = useCreateExport();

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

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const computeScale = () => {
      const containerWidth = el.clientWidth;
      const horizontalPadding = 40;
      const available = Math.max(260, containerWidth - horizontalPadding);
      const calculatedScale = Math.min(1.0, Math.max(0.35, available / BASE_A4_WIDTH));
      setScale(calculatedScale);
    };

    computeScale();
    const observer = new ResizeObserver(computeScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isOpen]);

  if (!isOpen || !document) {
    return null;
  }

  const activeVersionData =
    document.versions.find((v) => v.version === selectedVersion) ||
    document.versions[0];

  const downloadExport = async (exportId: string, extension: "pdf" | "json") => {
    const blob = await exportService.downloadExport(exportId);
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `veritas-draft-${exportId}.${extension}`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async () => {
    if (!activeVersionData) return;
    setExportDropdownOpen(false);
    setExportingFormat("pdf");
    try {
      const versionId = activeVersionData.versionId || document.id;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(versionId);
      if (isUuid) {
        const result = await createExportMutation.mutateAsync({
          versionId,
          payload: { format: "pdf", mode: "draft" },
        });
        await downloadExport(result.id, "pdf");
      } else {
        printDocument(document.title, activeVersionData.pages);
      }
    } catch {
      printDocument(document.title, activeVersionData.pages);
    } finally {
      setExportingFormat(null);
    }
  };

  const handleExportJson = async () => {
    if (!activeVersionData) return;
    setExportDropdownOpen(false);
    setExportingFormat("json");
    try {
      const versionId = activeVersionData.versionId || document.id;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(versionId);
      if (isUuid) {
        const result = await createExportMutation.mutateAsync({
          versionId,
          payload: { format: "json", mode: "draft" },
        });
        await downloadExport(result.id, "json");
      } else {
        const jsonStr = JSON.stringify(document, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = window.document.createElement("a");
        link.href = url;
        link.download = `${document.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch {
      const jsonStr = JSON.stringify(document, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = `${document.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setExportingFormat(null);
    }
  };

  const handleExportMarkdown = () => {
    if (!activeVersionData) return;
    exportAsMarkdown(document.title, activeVersionData.pages);
    setExportDropdownOpen(false);
  };

  const handleOpenEditor = () => {
    if (typeof window !== "undefined" && document) {
      try {
        localStorage.setItem(
          `veritas-draft-${document.id}`,
          JSON.stringify(document),
        );
        localStorage.setItem(
          `veritas-draft-html-${document.id}-${selectedVersion}`,
          draftToTipTapHtml(document, selectedVersion),
        );
      } catch {
        // Storage may be unavailable; opening the editor must still work.
      }
    }
    onOpenInEditor?.();
  };

  const scaledWidth = Math.round(BASE_A4_WIDTH * scale);
  const scaledHeight = Math.round(BASE_A4_HEIGHT * scale);

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
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-medium uppercase tracking-wider text-stone-400 font-mono">
            Generated draft
          </span>
          <strong className="text-[13px] font-semibold text-stone-900 truncate">
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

          <div className="relative">
            <button
              type="button"
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              className="flex h-7 items-center gap-1 rounded-md border border-[#cbe0f2] bg-white px-2 text-[11.5px] text-stone-700 transition-colors hover:bg-[#f7fbfe]"
            >
              <DownloadIcon size={12} />
              <span>Export</span>
              <ChevronDownIcon size={10} className="text-stone-400 ml-0.5" />
            </button>

            {exportDropdownOpen && (
              <div className="absolute right-0 top-full z-50 mt-1.5 w-52 rounded-lg border border-stone-200 bg-white p-1.5 shadow-xl text-xs">
                <div className="px-2.5 py-1 text-[10px] font-mono uppercase font-semibold text-stone-400">
                  Export Options
                </div>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={exportingFormat !== null}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-stone-700 hover:bg-[#edf4fa] hover:text-[#2c5478] cursor-pointer transition-colors disabled:opacity-60"
                >
                  <PdfDocIcon size={17} className="shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-medium text-stone-900">
                      {exportingFormat === "pdf" ? "Exporting PDF..." : "PDF Document"}
                    </span>
                    <span className="text-[10px] text-stone-400">Server-verified draft PDF</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={handleExportJson}
                  disabled={exportingFormat !== null}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-stone-700 hover:bg-[#edf4fa] hover:text-[#2c5478] cursor-pointer transition-colors disabled:opacity-60"
                >
                  <div className="flex h-[17px] w-[17px] items-center justify-center rounded bg-[#edf4fa] text-[10px] font-bold text-[#487aa8] shrink-0 font-mono">
                    JS
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-stone-900">
                      {exportingFormat === "json" ? "Exporting JSON..." : "JSON Package"}
                    </span>
                    <span className="text-[10px] text-stone-400">Structured legal AST (.json)</span>
                  </div>
                </button>
                <div
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-stone-400 opacity-60 cursor-not-allowed select-none"
                  title="Reviewed DOCX export requires the backend review gate"
                >
                  <WordDocIcon size={17} className="shrink-0" />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-stone-500">Word Document</span>
                      <span className="rounded bg-stone-100 px-1 py-0.2 text-[9px] font-mono text-stone-500">
                        Review Gate
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-400">Disabled until reviewed</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExportMarkdown}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-stone-700 hover:bg-[#edf4fa] hover:text-[#2c5478] cursor-pointer transition-colors"
                >
                  <MarkdownDocIcon size={17} className="shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-medium text-stone-900">Markdown</span>
                    <span className="text-[10px] text-stone-400">.md text format</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {onOpenInEditor && (
            <button
              type="button"
              onClick={handleOpenEditor}
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

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 [scrollbar-width:thin]"
      >
        <div className="flex flex-col items-center gap-6 mx-auto w-full">
          {activeVersionData?.pages.map((page) => (
            <div
              key={page.pageNumber}
              style={{
                width: `${scaledWidth}px`,
                height: `${scaledHeight}px`,
              }}
              className="relative shrink-0 select-text overflow-hidden rounded-[3px] border border-[#cbe0f2] bg-white shadow-md transition-[width,height] duration-75"
            >
              <article
                style={{
                  width: `${BASE_A4_WIDTH}px`,
                  height: `${BASE_A4_HEIGHT}px`,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }}
                className="absolute left-0 top-0 flex flex-col justify-between bg-white p-12 font-serif text-[#181c20]"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-3 font-sans text-[11px] text-stone-500 font-mono tracking-wider uppercase">
                    <span>{page.headerTitle}</span>
                    <span>
                      Page {page.pageNumber} of {page.totalPdfPages}
                    </span>
                  </div>

                  {page.subHeader && (
                    <div className="text-center font-sans py-2.5 border-b border-stone-200">
                      <p className="text-[12px] font-bold text-stone-900 uppercase tracking-wide whitespace-pre-line leading-relaxed">
                        {page.subHeader}
                      </p>
                    </div>
                  )}

                  <div className="space-y-5 pt-2">
                    {page.sections.map((sec, sIdx) => (
                      <div key={sec.id || sIdx} className="space-y-2">
                        <h4 className="font-sans text-[12px] font-bold text-stone-900 uppercase tracking-wide">
                          {sec.title}
                        </h4>
                        <p className="text-[13.5px] leading-[1.75] text-stone-800 whitespace-pre-line text-justify">
                          {sec.content}
                        </p>
                        {sec.citations && sec.citations.length > 0 && (
                          <div className="mt-2 space-y-1.5 pl-3 border-l-2 border-[#487aa8] bg-[#edf4fa]/60 py-1.5 pr-2 rounded-r">
                            {sec.citations.map((cit, cIdx) => (
                              <div
                                key={cIdx}
                                className="flex items-baseline justify-between font-sans text-[11px]"
                              >
                                <span className="font-semibold text-[#2c5478]">
                                  {cit.title} ·{" "}
                                  <span className="font-normal italic">
                                    {cit.citation}
                                  </span>
                                </span>
                                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#dcfce7] text-[#2e7d46] font-medium ml-2 shrink-0">
                                  {cit.status} · {cit.court}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-stone-200 pt-3 mt-6 flex items-center justify-between font-sans text-[11px] text-stone-400 font-mono">
                  <span>CONFIDENTIAL · FOR LEGAL REVIEW ONLY</span>
                  <span>
                    Page {page.pageNumber} of {page.totalPdfPages}
                  </span>
                </div>
              </article>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
