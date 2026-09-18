"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { PaginationPlus } from "tiptap-pagination-plus";

import { DraftingHeader } from "../../../components/drafting/drafting-header";
import { DraftingToolbar } from "../../../components/drafting/drafting-toolbar";
import { DraftingCanvas } from "../../../components/drafting/drafting-canvas";
import { DraftingBottomBar } from "../../../components/drafting/drafting-bottom-bar";
import { FontSizeExtension } from "../../../lib/draft/font-size-extension";
import { CitationExtension } from "../../../lib/draft/citation-extension";
import {
  draftToTipTapHtml,
  getDraftById,
  SEED_DRAFT_DOC,
} from "../../../lib/draft/draft-data";
import {
  exportAsDocx,
  exportAsMarkdown,
  printDocument,
} from "../../../lib/draft/export-document";
import type { DraftDocument, DraftSaveStatus } from "../../../types/draft/types";

import "../../../components/drafting/drafting-editor.css";

const DRAFT_STORAGE_PREFIX = "veritas-draft-v4";

export default function DraftingIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const draftId = resolvedParams.id;

  const [documentState, setDocumentState] = useState<DraftDocument>(() => {
    const seed = getDraftById(draftId);
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`veritas-draft-${draftId}`);
        if (saved) return JSON.parse(saved);
      } catch {
        // Fallback to seed
      }
    }
    return seed;
  });

  const [selectedVersion, setSelectedVersion] = useState<string>(
    documentState.currentVersion || "v3",
  );
  const [zoom, setZoom] = useState<number>(100);
  const [status, setStatus] = useState<DraftSaveStatus>("saved");
  const [pageCount, setPageCount] = useState<number>(1);
  const [wordCount, setWordCount] = useState<number>(0);
  const [charCount, setCharCount] = useState<number>(0);

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Guarantee rich, non-empty legal HTML
  const initialHtml = useMemo(() => {
    if (typeof window !== "undefined") {
      try {
        // Clean legacy corrupted keys if present
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("veritas-draft-html-")) {
            localStorage.removeItem(key);
          }
        });

        const savedHtml = localStorage.getItem(
          `${DRAFT_STORAGE_PREFIX}-${draftId}-${selectedVersion}`,
        );
        if (
          savedHtml &&
          savedHtml.trim().length > 20 &&
          !savedHtml.includes("rm-page") &&
          !savedHtml.includes("rm-pagination")
        ) {
          return savedHtml;
        }
      } catch {
        // Fallback
      }
    }
    const generated = draftToTipTapHtml(documentState, selectedVersion);
    if (!generated || generated.trim().length < 20) {
      return draftToTipTapHtml(SEED_DRAFT_DOC, "v3");
    }
    return generated;
  }, [documentState, draftId, selectedVersion]);

  // Setup TipTap Editor with PaginationPlus
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right", "justify"],
        defaultAlignment: "justify",
      }),
      TextStyle,
      FontFamily,
      FontSizeExtension,
      CitationExtension,
      Color,
      Highlight.configure({ multicolor: true }),
      PaginationPlus.configure({
        pageHeight: 1123,
        pageWidth: 794,
        pageGap: 24,
        pageGapBorderSize: 1,
        pageGapBorderColor: "#cbd5e1",
        pageBreakBackground: "#eaf0f6",
        marginTop: 48,
        marginBottom: 48,
        marginLeft: 48,
        marginRight: 48,
        contentMarginTop: 10,
        contentMarginBottom: 10,
        footerRight: "Page {page}",
        footerLeft: "CONFIDENTIAL · COURT SUBMISSION",
      }),
    ],
    content: initialHtml,
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[60vh] mx-auto text-stone-900",
        spellcheck: "false",
      },
    },
  });

  // Ensure content is immediately mounted into the editor
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const current = editor.getHTML();
    if (!current || current === "<p></p>" || current.trim().length < 20) {
      editor.commands.setContent(initialHtml, { emitUpdate: true });
    }
  }, [editor, initialHtml]);

  // Immediate pagination calculation - forces PaginationPlus to measure and split pages on load without delay
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    const forcePagination = () => {
      if (!editor || editor.isDestroyed || !editor.view) return;
      try {
        editor.view.dispatch(editor.state.tr.setMeta("PAGE_COUNT_META_KEY", {}));
      } catch {
        // Safe fallback
      }
    };

    const rafId = requestAnimationFrame(forcePagination);
    const t1 = setTimeout(forcePagination, 40);
    const t2 = setTimeout(forcePagination, 160);
    const t3 = setTimeout(forcePagination, 450);

    if (typeof document !== "undefined" && document.fonts) {
      document.fonts.ready.then(forcePagination).catch(() => {});
    }

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [editor]);

  // Schedule autosave
  const scheduleAutoSave = useCallback(() => {
    setStatus("unsaved");
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      if (!editor) return;
      const html = editor.getHTML();
      if (!html || html === "<p></p>") return;

      setStatus("saving");
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(
            `${DRAFT_STORAGE_PREFIX}-${draftId}-${selectedVersion}`,
            html,
          );
        }
        setTimeout(() => setStatus("saved"), 350);
      } catch {
        setStatus("unsaved");
      }
    }, 1200);
  }, [draftId, editor, selectedVersion]);

  // Track live statistics from editor
  useEffect(() => {
    if (!editor) return;

    const updateStats = () => {
      const text = editor.getText();
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      setWordCount(words);
      setCharCount(text.length);

      if (typeof window !== "undefined") {
        const paginationEl = document.querySelector("[data-rm-pagination]");
        const count = paginationEl?.children.length || 1;
        setPageCount(Math.max(1, count));
      }
    };

    updateStats();
    editor.on("update", updateStats);
    editor.on("update", scheduleAutoSave);

    return () => {
      editor.off("update", updateStats);
      editor.off("update", scheduleAutoSave);
    };
  }, [editor, scheduleAutoSave]);

  // Handle version switcher
  const handleVersionChange = (versionKey: string) => {
    setSelectedVersion(versionKey);
    if (!editor) return;

    let targetHtml = "";
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(
          `${DRAFT_STORAGE_PREFIX}-${draftId}-${versionKey}`,
        );
        if (
          saved &&
          saved.trim().length > 20 &&
          !saved.includes("rm-page") &&
          !saved.includes("rm-pagination")
        ) {
          targetHtml = saved;
        }
      } catch {
        // Ignored
      }
    }
    if (!targetHtml) {
      targetHtml = draftToTipTapHtml(documentState, versionKey);
    }
    editor.commands.setContent(targetHtml);
  };

  const handleTitleChange = (newTitle: string) => {
    const updated: DraftDocument = { ...documentState, title: newTitle };
    setDocumentState(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          `veritas-draft-${draftId}`,
          JSON.stringify(updated),
        );
      } catch {
        // Ignored
      }
    }
  };

  const handleFitWidth = () => {
    setZoom(90);
  };

  // Direct export from editor HTML
  const handleExportDocx = () => {
    const html = editor?.getHTML() || initialHtml;
    exportAsDocx(documentState.title, html);
  };

  const handlePrintPdf = () => {
    const html = editor?.getHTML() || initialHtml;
    printDocument(documentState.title, html);
  };

  const handleExportMarkdown = () => {
    const html = editor?.getHTML() || initialHtml;
    exportAsMarkdown(documentState.title, html);
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#eaf0f6] select-text">
      {/* 1. Header with back, title rename, version switcher, and export */}
      <DraftingHeader
        title={documentState.title}
        onTitleChange={handleTitleChange}
        currentVersion={selectedVersion}
        versions={documentState.versions}
        onVersionChange={handleVersionChange}
        status={status}
        onBack={() => router.back()}
        onExportDocx={handleExportDocx}
        onPrintPdf={handlePrintPdf}
        onExportMarkdown={handleExportMarkdown}
      />

      {/* 2. Rich TipTap Toolbar with Headings, Fonts, Sizes, Alignment, Lists */}
      <DraftingToolbar
        editor={editor}
        zoom={zoom}
        onZoomChange={setZoom}
      />

      {/* 3. True A4 Continuous Paginated Canvas */}
      <DraftingCanvas editor={editor} zoom={zoom} />

      {/* 4. Bottom Metrics Bar */}
      <DraftingBottomBar
        pageCount={pageCount}
        wordCount={wordCount}
        charCount={charCount}
        zoom={zoom}
        onZoomChange={setZoom}
        onFitWidth={handleFitWidth}
      />
    </div>
  );
}
