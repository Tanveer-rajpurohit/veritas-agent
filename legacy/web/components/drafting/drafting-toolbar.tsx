"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Editor } from "@tiptap/react";
import {
  Undo,
  Redo,
  Minus,
  Plus,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  ChevronDown,
  Quote,
  Paintbrush,
  Highlighter,
  Type,
  AtSign,
  X,
} from "lucide-react";

interface DraftingToolbarProps {
  editor: Editor | null;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

const FONT_FAMILIES = [
  { label: "Legal Serif (Newsreader)", value: "'Newsreader', Georgia, serif" },
  { label: "Modern Sans (Figtree)", value: "'Figtree', sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Courier (Monospace)", value: "'Courier New', Courier, monospace" },
];

const FONT_SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32];

const TEXT_COLORS = [
  { label: "Legal Dark", value: "#1a1a1a" },
  { label: "Veritas Blue", value: "#2c5478" },
  { label: "Sky Primary", value: "#487aa8" },
  { label: "Muted Slate", value: "#64748b" },
  { label: "Red Alert", value: "#dc2626" },
  { label: "Emerald Green", value: "#16a34a" },
];

const HIGHLIGHT_COLORS = [
  { label: "None", value: "none" },
  { label: "Soft Yellow", value: "#fef08a" },
  { label: "Sky Tint", value: "#cbe0f2" },
  { label: "Mint Green", value: "#bbf7d0" },
  { label: "Soft Rose", value: "#fecdd3" },
  { label: "Warm Peach", value: "#fed7aa" },
];

function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  cb: () => void,
) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        cb();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, cb]);
}

export function DraftingToolbar({
  editor,
  zoom,
  onZoomChange,
}: DraftingToolbarProps) {
  const [headingOpen, setHeadingOpen] = useState(false);
  const [fontFamilyOpen, setFontFamilyOpen] = useState(false);
  const [fontSizeOpen, setFontSizeOpen] = useState(false);
  const [textColorOpen, setTextColorOpen] = useState(false);
  const [highlightOpen, setHighlightOpen] = useState(false);
  const [citationModalOpen, setCitationModalOpen] = useState(false);
  const [citationTitle, setCitationTitle] = useState("");
  const [citationRef, setCitationRef] = useState("");
  const [citationUrl, setCitationUrl] = useState("");
  const [currentFontSize, setCurrentFontSize] = useState(13);

  const headingRef = useRef<HTMLDivElement>(null);
  const fontRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef<HTMLDivElement>(null);
  const colorRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const citationRefEl = useRef<HTMLDivElement>(null);

  useClickOutside(headingRef, () => setHeadingOpen(false));
  useClickOutside(fontRef, () => setFontFamilyOpen(false));
  useClickOutside(sizeRef, () => setFontSizeOpen(false));
  useClickOutside(colorRef, () => setTextColorOpen(false));
  useClickOutside(highlightRef, () => setHighlightOpen(false));
  useClickOutside(citationRefEl, () => setCitationModalOpen(false));

  // Sync font size display with selection
  useEffect(() => {
    if (!editor) return;
    const syncSize = () => {
      if (editor.isActive("heading", { level: 1 })) {
        setCurrentFontSize(18);
        return;
      }
      if (editor.isActive("heading", { level: 2 })) {
        setCurrentFontSize(14);
        return;
      }
      if (editor.isActive("heading", { level: 3 })) {
        setCurrentFontSize(12);
        return;
      }
      const raw = editor.getAttributes("textStyle")?.fontSize;
      if (raw) {
        const num = parseInt(String(raw), 10);
        if (!isNaN(num)) {
          setCurrentFontSize(num);
          return;
        }
      }
      setCurrentFontSize(13);
    };

    editor.on("selectionUpdate", syncSize);
    editor.on("transaction", syncSize);
    return () => {
      editor.off("selectionUpdate", syncSize);
      editor.off("transaction", syncSize);
    };
  }, [editor]);

  const applyFontSize = useCallback(
    (size: number) => {
      setCurrentFontSize(size);
      setFontSizeOpen(false);
      editor?.chain().focus().setFontSize(`${size}px`).run();
    },
    [editor],
  );

  const applyFontFamily = useCallback(
    (family: string) => {
      setFontFamilyOpen(false);
      if (!family) editor?.chain().focus().unsetFontFamily().run();
      else editor?.chain().focus().setFontFamily(family).run();
    },
    [editor],
  );

  const insertPrecedentBlock = useCallback(() => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent(
        `<blockquote><p><strong>Precedent Citation:</strong> <em>Innoventive Industries Ltd. Vs. ICICI Bank</em>, (2018) 1 SCC 407 — <strong>Supreme Court of India</strong> [Supported]</p></blockquote><p></p>`,
      )
      .run();
  }, [editor]);

  const handleOpenCitationModal = useCallback(() => {
    if (editor) {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        const selected = editor.state.doc.textBetween(from, to, " ").trim();
        if (selected) {
          if (selected.includes(";")) {
            const parts = selected.split(";");
            setCitationTitle(parts[0]?.trim() || "");
            setCitationRef(parts[1]?.trim() || "");
          } else if (selected.includes(",")) {
            const idx = selected.indexOf(",");
            setCitationTitle(selected.substring(0, idx).trim());
            setCitationRef(selected.substring(idx + 1).trim());
          } else {
            setCitationTitle(selected);
            setCitationRef("");
          }
        }
      } else {
        setCitationTitle("");
        setCitationRef("");
        setCitationUrl("");
      }
    }
    setCitationModalOpen((prev) => !prev);
  }, [editor]);

  const insertInlineCitation = useCallback(() => {
    if (!editor) return;

    const title = citationTitle.trim() || "Case Name v. Opposing Party";
    const ref = citationRef.trim() || "AIR 1973 SC 1461";
    const url = citationUrl.trim();

    // Standard Indian Legal Digital Citation:
    // <u>Case Name</u>; Citation Details
    // Wrapped in .inline-citation for hover detection and editing
    const contentHtml = `<span class="inline-citation cursor-pointer" data-citation-title="${title}" data-citation="${ref}" ${url ? `data-citation-link="${url}"` : ""}><u class="underline decoration-[#487aa8] underline-offset-[3px] font-medium text-[#2c5478] hover:text-[#1a3c5e]">${title}</u>; ${ref}</span>&nbsp;`;

    editor.chain().focus().insertContent(contentHtml).run();
    setCitationModalOpen(false);
  }, [editor, citationTitle, citationRef, citationUrl]);

  if (!editor) {
    return (
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-[#cbe0f2] bg-white px-4 z-30">
        <div className="h-4 w-48 animate-pulse rounded bg-stone-100" />
      </div>
    );
  }

  const canUndo = editor.can().undo();
  const canRedo = editor.can().redo();
  const isBold = editor.isActive("bold");
  const isItalic = editor.isActive("italic");
  const isUnderline = editor.isActive("underline");
  const isStrike = editor.isActive("strike");
  const isBulletList = editor.isActive("bulletList");
  const isOrderedList = editor.isActive("orderedList");
  const isLeft = editor.isActive({ textAlign: "left" });
  const isCenter = editor.isActive({ textAlign: "center" });
  const isRight = editor.isActive({ textAlign: "right" });
  const isJustify = editor.isActive({ textAlign: "justify" });
  const isBlockquote = editor.isActive("blockquote");

  const currentHeadingLabel = editor.isActive("heading", { level: 1 })
    ? "Heading 1"
    : editor.isActive("heading", { level: 2 })
      ? "Heading 2"
      : editor.isActive("heading", { level: 3 })
        ? "Heading 3"
        : "Normal Text";

  return (
    <div className="relative z-30 flex min-h-[44px] shrink-0 items-center justify-between border-b border-[#cbe0f2] bg-white px-3 text-xs select-none shadow-xs overflow-visible">
      <div className="flex items-center gap-1 flex-wrap overflow-visible">
        {/* Undo / Redo */}
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="flex h-7 w-7 items-center justify-center rounded text-stone-600 hover:bg-[#edf4fa] hover:text-[#2c5478] disabled:opacity-30 cursor-pointer transition-colors"
        >
          <Undo className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className="flex h-7 w-7 items-center justify-center rounded text-stone-600 hover:bg-[#edf4fa] hover:text-[#2c5478] disabled:opacity-30 cursor-pointer transition-colors"
        >
          <Redo className="h-3.5 w-3.5" />
        </button>

        <div className="mx-1 h-4 w-px bg-stone-200 shrink-0" />

        {/* Zoom Controls (— 100% +) */}
        <div className="flex items-center rounded border border-[#cbe0f2] bg-white text-[11px] font-mono shrink-0">
          <button
            type="button"
            onClick={() => onZoomChange(Math.max(40, zoom - 10))}
            disabled={zoom <= 40}
            title="Zoom Out"
            className="flex h-6 w-5 items-center justify-center text-stone-600 hover:bg-[#edf4fa] disabled:opacity-30 cursor-pointer"
          >
            <Minus className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => onZoomChange(100)}
            title="Reset Zoom to 100%"
            className="h-6 px-1.5 font-medium text-stone-700 hover:text-[#2c5478] cursor-pointer"
          >
            {zoom}%
          </button>
          <button
            type="button"
            onClick={() => onZoomChange(Math.min(160, zoom + 10))}
            disabled={zoom >= 160}
            title="Zoom In"
            className="flex h-6 w-5 items-center justify-center text-stone-600 hover:bg-[#edf4fa] disabled:opacity-30 cursor-pointer"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>

        <div className="mx-1 h-4 w-px bg-stone-200 shrink-0" />

        {/* Heading Level Dropdown */}
        <div ref={headingRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setHeadingOpen(!headingOpen)}
            className="flex h-7 items-center gap-1 rounded border border-[#cbe0f2] bg-white px-2 text-[11px] font-medium text-stone-700 hover:bg-[#edf4fa] cursor-pointer"
          >
            <span>{currentHeadingLabel}</span>
            <ChevronDown className="h-3 w-3 text-stone-400" />
          </button>
          {headingOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-40 rounded-lg border border-stone-200 bg-white p-1 shadow-xl z-50 text-xs">
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().setParagraph().run();
                  setHeadingOpen(false);
                }}
                className="flex w-full rounded px-2.5 py-1.5 text-left text-stone-700 hover:bg-[#edf4fa] hover:text-[#2c5478] cursor-pointer"
              >
                Normal Text
              </button>
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level: 1 }).run();
                  setHeadingOpen(false);
                }}
                className="flex w-full rounded px-2.5 py-1.5 text-left font-bold text-stone-900 hover:bg-[#edf4fa] hover:text-[#2c5478] cursor-pointer text-sm"
              >
                Heading 1
              </button>
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level: 2 }).run();
                  setHeadingOpen(false);
                }}
                className="flex w-full rounded px-2.5 py-1.5 text-left font-semibold uppercase text-stone-900 hover:bg-[#edf4fa] hover:text-[#2c5478] cursor-pointer text-xs"
              >
                Heading 2 (Part)
              </button>
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level: 3 }).run();
                  setHeadingOpen(false);
                }}
                className="flex w-full rounded px-2.5 py-1.5 text-left font-medium text-stone-800 hover:bg-[#edf4fa] hover:text-[#2c5478] cursor-pointer text-xs"
              >
                Heading 3
              </button>
            </div>
          )}
        </div>

        {/* Font Family Dropdown */}
        <div ref={fontRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setFontFamilyOpen(!fontFamilyOpen)}
            title="Font Family"
            className="flex h-7 items-center gap-1 rounded border border-[#cbe0f2] bg-white px-2 text-[11px] text-stone-700 hover:bg-[#edf4fa] cursor-pointer"
          >
            <Type className="h-3.5 w-3.5 text-stone-500" />
            <ChevronDown className="h-3 w-3 text-stone-400" />
          </button>
          {fontFamilyOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-52 rounded-lg border border-stone-200 bg-white p-1.5 shadow-xl z-50 text-xs">
              {FONT_FAMILIES.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => applyFontFamily(f.value)}
                  style={{ fontFamily: f.value }}
                  className="flex w-full rounded px-2.5 py-1.5 text-left text-stone-800 hover:bg-[#edf4fa] hover:text-[#2c5478] cursor-pointer transition-colors"
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Font Size controls (- / 13 / +) */}
        <div
          ref={sizeRef}
          className="relative flex items-center rounded border border-[#cbe0f2] bg-white text-[11px] font-mono shrink-0"
        >
          <button
            type="button"
            onClick={() => applyFontSize(Math.max(8, currentFontSize - 1))}
            title="Decrease Font Size"
            className="flex h-6 w-5 items-center justify-center text-stone-600 hover:bg-[#edf4fa] cursor-pointer"
          >
            <Minus className="h-2.5 w-2.5" />
          </button>
          <button
            type="button"
            onClick={() => setFontSizeOpen(!fontSizeOpen)}
            title="Choose Font Size"
            className="h-6 w-7 text-center font-medium text-stone-800 hover:bg-[#edf4fa] cursor-pointer"
          >
            {currentFontSize}
          </button>
          <button
            type="button"
            onClick={() => applyFontSize(Math.min(48, currentFontSize + 1))}
            title="Increase Font Size"
            className="flex h-6 w-5 items-center justify-center text-stone-600 hover:bg-[#edf4fa] cursor-pointer"
          >
            <Plus className="h-2.5 w-2.5" />
          </button>
          {fontSizeOpen && (
            <div className="absolute left-0 top-full mt-1.5 max-h-48 w-20 overflow-y-auto rounded-lg border border-stone-200 bg-white p-1 shadow-xl z-50 text-center">
              {FONT_SIZES.map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => applyFontSize(sz)}
                  className={`flex w-full justify-center rounded py-1 text-xs cursor-pointer ${
                    currentFontSize === sz
                      ? "bg-[#edf4fa] font-bold text-[#2c5478]"
                      : "hover:bg-stone-50 text-stone-700"
                  }`}
                >
                  {sz} px
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mx-1 h-4 w-px bg-stone-200 shrink-0" />

        {/* Bold, Italic, Underline, Strike */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold (Ctrl+B)"
          className={`flex h-7 w-7 items-center justify-center rounded font-serif font-bold text-sm cursor-pointer transition-colors ${
            isBold
              ? "bg-[#edf4fa] text-[#2c5478] ring-1 ring-[#cbe0f2]"
              : "text-stone-700 hover:bg-stone-100"
          }`}
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic (Ctrl+I)"
          className={`flex h-7 w-7 items-center justify-center rounded font-serif italic text-sm cursor-pointer transition-colors ${
            isItalic
              ? "bg-[#edf4fa] text-[#2c5478] ring-1 ring-[#cbe0f2]"
              : "text-stone-700 hover:bg-stone-100"
          }`}
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline (Ctrl+U)"
          className={`flex h-7 w-7 items-center justify-center rounded cursor-pointer transition-colors ${
            isUnderline
              ? "bg-[#edf4fa] text-[#2c5478] ring-1 ring-[#cbe0f2]"
              : "text-stone-700 hover:bg-stone-100"
          }`}
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
          className={`flex h-7 w-7 items-center justify-center rounded cursor-pointer transition-colors ${
            isStrike
              ? "bg-[#edf4fa] text-[#2c5478] ring-1 ring-[#cbe0f2]"
              : "text-stone-700 hover:bg-stone-100"
          }`}
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </button>

        <div className="mx-1 h-4 w-px bg-stone-200 shrink-0" />

        {/* Text Color Picker */}
        <div ref={colorRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setTextColorOpen(!textColorOpen)}
            title="Text Color"
            className="flex h-7 w-7 items-center justify-center rounded text-stone-700 hover:bg-stone-100 cursor-pointer"
          >
            <Paintbrush className="h-3.5 w-3.5" />
          </button>
          {textColorOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-48 rounded-lg border border-stone-200 bg-white p-2.5 shadow-xl z-50">
              <div className="mb-2 text-[10px] font-mono uppercase text-stone-400 font-semibold">
                Text Color
              </div>
              <div className="grid grid-cols-3 gap-2">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    onClick={() => {
                      editor.chain().focus().setColor(c.value).run();
                      setTextColorOpen(false);
                    }}
                    className="flex h-7 w-full items-center justify-center rounded border border-stone-200 hover:scale-110 transition-transform cursor-pointer shadow-2xs"
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Highlight Picker */}
        <div ref={highlightRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setHighlightOpen(!highlightOpen)}
            title="Highlight Text"
            className="flex h-7 w-7 items-center justify-center rounded text-stone-700 hover:bg-stone-100 cursor-pointer"
          >
            <Highlighter className="h-3.5 w-3.5" />
          </button>
          {highlightOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-48 rounded-lg border border-stone-200 bg-white p-2.5 shadow-xl z-50">
              <div className="mb-2 text-[10px] font-mono uppercase text-stone-400 font-semibold">
                Highlight Color
              </div>
              <div className="grid grid-cols-3 gap-2">
                {HIGHLIGHT_COLORS.map((h) => (
                  <button
                    key={h.value}
                    type="button"
                    title={h.label}
                    onClick={() => {
                      if (h.value === "none") {
                        editor.chain().focus().unsetHighlight().run();
                      } else {
                        editor
                          .chain()
                          .focus()
                          .setHighlight({ color: h.value })
                          .run();
                      }
                      setHighlightOpen(false);
                    }}
                    className="flex h-7 w-full items-center justify-center rounded border border-stone-200 hover:scale-110 transition-transform cursor-pointer text-[10px] font-bold shadow-2xs text-stone-500"
                    style={{
                      backgroundColor:
                        h.value === "none" ? "#ffffff" : h.value,
                    }}
                  >
                    {h.value === "none" ? "✕" : ""}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mx-1 h-4 w-px bg-stone-200 shrink-0" />

        {/* Alignment buttons */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          title="Align Left"
          className={`flex h-7 w-7 items-center justify-center rounded cursor-pointer ${
            isLeft
              ? "bg-[#edf4fa] text-[#2c5478] ring-1 ring-[#cbe0f2]"
              : "text-stone-700 hover:bg-stone-100"
          }`}
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          title="Align Center"
          className={`flex h-7 w-7 items-center justify-center rounded cursor-pointer ${
            isCenter
              ? "bg-[#edf4fa] text-[#2c5478] ring-1 ring-[#cbe0f2]"
              : "text-stone-700 hover:bg-stone-100"
          }`}
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          title="Align Right"
          className={`flex h-7 w-7 items-center justify-center rounded cursor-pointer ${
            isRight
              ? "bg-[#edf4fa] text-[#2c5478] ring-1 ring-[#cbe0f2]"
              : "text-stone-700 hover:bg-stone-100"
          }`}
        >
          <AlignRight className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          title="Justify (Standard Legal)"
          className={`flex h-7 w-7 items-center justify-center rounded cursor-pointer ${
            isJustify
              ? "bg-[#edf4fa] text-[#2c5478] ring-1 ring-[#cbe0f2]"
              : "text-stone-700 hover:bg-stone-100"
          }`}
        >
          <AlignJustify className="h-3.5 w-3.5" />
        </button>

        <div className="mx-1 h-4 w-px bg-stone-200 shrink-0" />

        {/* Lists */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
          className={`flex h-7 w-7 items-center justify-center rounded cursor-pointer ${
            isBulletList
              ? "bg-[#edf4fa] text-[#2c5478] ring-1 ring-[#cbe0f2]"
              : "text-stone-700 hover:bg-stone-100"
          }`}
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
          className={`flex h-7 w-7 items-center justify-center rounded cursor-pointer ${
            isOrderedList
              ? "bg-[#edf4fa] text-[#2c5478] ring-1 ring-[#cbe0f2]"
              : "text-stone-700 hover:bg-stone-100"
          }`}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </button>

        <div className="mx-1 h-4 w-px bg-stone-200 shrink-0" />

        {/* Precedent Blockquote */}
        <button
          type="button"
          onClick={insertPrecedentBlock}
          title="Insert Precedent Authority Block"
          className={`flex h-7 items-center gap-1 rounded border border-[#cbe0f2] bg-white px-2 text-[11px] font-medium text-[#2c5478] hover:bg-[#edf4fa] cursor-pointer transition-colors shrink-0 ${
            isBlockquote ? "bg-[#edf4fa] ring-1 ring-[#cbe0f2]" : ""
          }`}
        >
          <Quote className="h-3 w-3" />
          <span>Precedent Box</span>
        </button>

        {/* Inline Citation Dialog / Insertion */}
        <div ref={citationRefEl} className="relative shrink-0">
          <button
            type="button"
            onClick={handleOpenCitationModal}
            title="Insert Legal Precedent Citation (@)"
            className="flex h-7 items-center gap-1.5 rounded border border-[#cbe0f2] bg-[#edf4fa] px-2 text-[11px] font-medium text-[#2c5478] hover:bg-[#dbe9f6] cursor-pointer transition-colors"
          >
            <AtSign className="h-3.5 w-3.5 text-[#487aa8]" />
            <span>Citation</span>
          </button>

          {citationModalOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-[330px] max-w-[calc(100vw-24px)] rounded-xl border border-stone-200 bg-white p-3.5 shadow-2xl z-50 text-xs select-none">
              {/* Minimal Clean Header */}
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <div className="flex items-center gap-1.5 font-semibold text-stone-900 text-xs">
                  <AtSign className="h-3.5 w-3.5 text-[#487aa8]" />
                  <span>Insert Citation</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCitationModalOpen(false)}
                  className="rounded p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-2.5 pt-2.5">
                {/* Case Name */}
                <div>
                  <label className="block text-[11px] font-medium text-stone-700 mb-1">
                    Case Name
                  </label>
                  <input
                    type="text"
                    value={citationTitle}
                    onChange={(e) => setCitationTitle(e.target.value)}
                    className="w-full rounded border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-[#487aa8] focus:ring-1 focus:ring-[#487aa8] focus:outline-none transition-colors"
                    placeholder="e.g. Innoventive Industries Ltd. v. ICICI Bank"
                    autoFocus
                  />
                </div>

                {/* Citation Details */}
                <div>
                  <label className="block text-[11px] font-medium text-stone-700 mb-1">
                    Citation Details
                  </label>
                  <input
                    type="text"
                    value={citationRef}
                    onChange={(e) => setCitationRef(e.target.value)}
                    className="w-full rounded border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-[#487aa8] focus:ring-1 focus:ring-[#487aa8] focus:outline-none transition-colors"
                    placeholder="e.g. (2018) 1 SCC 407 or 2023 INSC 54"
                  />
                </div>

                {/* Judgment URL */}
                <div>
                  <label className="block text-[11px] font-medium text-stone-700 mb-1">
                    Judgment URL <span className="text-stone-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="url"
                    value={citationUrl}
                    onChange={(e) => setCitationUrl(e.target.value)}
                    className="w-full rounded border border-stone-200 bg-white px-2.5 py-1.5 text-[11px] text-stone-800 font-mono placeholder:text-stone-400 focus:border-[#487aa8] focus:ring-1 focus:ring-[#487aa8] focus:outline-none transition-colors"
                    placeholder="https://indiankanoon.org/doc/..."
                  />
                </div>

                {/* Minimal Single-Line Preview */}
                <div className="rounded border border-stone-100 bg-stone-50/80 px-2.5 py-2 text-xs font-serif text-stone-800">
                  <span className="text-[9.5px] uppercase font-sans font-medium text-stone-400 block mb-0.5 tracking-wider">
                    Format Preview
                  </span>
                  <u className="underline decoration-[#487aa8] underline-offset-[3px] font-medium text-[#2c5478]">
                    {citationTitle.trim() || "Case Name v. Opposing Party"}
                  </u>
                  ; {citationRef.trim() || "AIR 1973 SC 1461"}
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setCitationModalOpen(false)}
                    className="rounded border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={insertInlineCitation}
                    className="rounded bg-[#487aa8] hover:bg-[#38648c] px-3.5 py-1.5 text-xs font-medium text-white transition-colors cursor-pointer shadow-xs"
                  >
                    Insert Citation
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
