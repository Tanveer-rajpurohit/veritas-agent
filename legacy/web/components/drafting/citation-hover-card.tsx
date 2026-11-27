"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { Editor } from "@tiptap/react";
import {
  ExternalLink,
  Edit3,
  Trash2,
  Check,
  X,
  AtSign,
} from "lucide-react";

interface CitationHoverCardProps {
  editor: Editor | null;
}

interface ActiveCitationData {
  top: number;
  left: number;
  width: number;
  height: number;
  title: string;
  ref: string;
  court: string;
  url: string;
}

function getCitationLinkLabel(url?: string): string {
  if (!url) return "Indian Kanoon";
  if (url.includes("indiankanoon.org")) return "Indian Kanoon";
  if (url.includes("sci.gov.in")) return "Supreme Court";
  if (url.includes("ecourts.gov.in")) return "e-Courts";
  if (url.includes("legitquest.com")) return "LegitQuest";
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    return host || "Open Link";
  } catch {
    return "Open Link";
  }
}

export function CitationHoverCard({ editor }: CitationHoverCardProps) {
  const [activeCitation, setActiveCitation] =
    useState<ActiveCitationData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editRef, setEditRef] = useState("");
  const [editUrl, setEditUrl] = useState("");

  // Store DOM element in ref to comply with React 19 immutability
  const activeElementRef = useRef<HTMLElement | null>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      if (!isEditing) {
        setActiveCitation(null);
        activeElementRef.current = null;
      }
    }, 280);
  }, [clearCloseTimeout, isEditing]);

  // Listen to mouseover and mouseout across editor DOM
  useEffect(() => {
    if (!editor || !editor.view) return;
    const dom = editor.view.dom;

    const handleMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest(
        ".inline-citation, a.legal-citation-link",
      ) as HTMLElement | null;
      if (!target) return;

      clearCloseTimeout();

      const rect = target.getBoundingClientRect();
      const title =
        target.getAttribute("data-citation-title") ||
        target.querySelector("u")?.textContent ||
        target.textContent?.split(";")[0]?.trim() ||
        "";
      const citation =
        target.getAttribute("data-citation") ||
        target.textContent?.split(";")[1]?.trim() ||
        "";
      const court =
        target.getAttribute("data-court") || "Supreme Court of India";
      const url =
        target.getAttribute("data-citation-link") ||
        target.getAttribute("href") ||
        "";

      activeElementRef.current = target;
      setActiveCitation({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        title,
        ref: citation,
        court,
        url,
      });

      if (!isEditing) {
        setEditTitle(title);
        setEditRef(citation);
        setEditUrl(url);
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest(
        ".inline-citation, a.legal-citation-link",
      );
      if (target) {
        scheduleClose();
      }
    };

    dom.addEventListener("mouseover", handleMouseOver);
    dom.addEventListener("mouseout", handleMouseOut);

    return () => {
      dom.removeEventListener("mouseover", handleMouseOver);
      dom.removeEventListener("mouseout", handleMouseOut);
      clearCloseTimeout();
    };
  }, [editor, isEditing, clearCloseTimeout, scheduleClose]);

  // Handle Escape key to close edit modal
  useEffect(() => {
    if (!isEditing) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsEditing(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isEditing]);

  const handleStartEdit = useCallback(() => {
    if (!activeCitation) return;
    clearCloseTimeout();
    setEditTitle(activeCitation.title);
    setEditRef(activeCitation.ref);
    setEditUrl(activeCitation.url);
    setIsEditing(true);
  }, [activeCitation, clearCloseTimeout]);

  // Save changes by replacing both the title and the citation details in TipTap
  const handleSaveEdit = useCallback(() => {
    const el = activeElementRef.current;
    if (!editor || !editor.view) return;

    const title = editTitle.trim() || "Case Name v. Opposing Party";
    const ref = editRef.trim() || "AIR 1973 SC 1461";
    const url = editUrl.trim();

    const newHtml = `<span class="inline-citation cursor-pointer" data-citation-title="${title}" data-citation="${ref}" ${url ? `data-citation-link="${url}"` : ""}><u class="underline decoration-[#487aa8] underline-offset-[3px] font-medium text-[#2c5478] hover:text-[#1a3c5e]">${title}</u>; ${ref}</span>`;

    try {
      if (el && el.parentNode) {
        const parent = el.parentNode;
        const childIndex = Array.from(parent.childNodes).indexOf(el);
        const from = editor.view.posAtDOM(parent, childIndex);
        let textLen = el.textContent?.length || 0;

        const next = el.nextSibling;
        if (
          next &&
          next.textContent &&
          (next.textContent.trim().startsWith(";") ||
            (activeCitation?.ref && next.textContent.includes(activeCitation.ref)))
        ) {
          textLen += next.textContent.length;
        }

        const to = from + textLen;
        if (from >= 0 && to >= from) {
          editor
            .chain()
            .focus()
            .deleteRange({ from, to })
            .insertContentAt(from, newHtml)
            .run();
        }
      }
    } catch {
      if (el) {
        el.setAttribute("data-citation-title", title);
        el.setAttribute("data-citation", ref);
        if (url) el.setAttribute("data-citation-link", url);
        else el.removeAttribute("data-citation-link");
        el.innerHTML = `<u class="underline decoration-[#487aa8] underline-offset-[3px] font-medium text-[#2c5478]">${title}</u>; ${ref}`;
        editor.view.dispatch(editor.state.tr);
      }
    }

    setActiveCitation(null);
    setIsEditing(false);
    activeElementRef.current = null;
  }, [editTitle, editRef, editUrl, activeCitation, editor]);

  // Remove citation markup: restores the case name text as clean plain text (removes underline and removes ; details)
  const handleRemoveCitation = useCallback(() => {
    const el = activeElementRef.current;
    if (!editor || !editor.view) return;

    const title = activeCitation?.title || el?.textContent || "";
    const ref = activeCitation?.ref || "";

    try {
      if (el && el.parentNode) {
        const parent = el.parentNode;
        const childIndex = Array.from(parent.childNodes).indexOf(el);
        const from = editor.view.posAtDOM(parent, childIndex);
        let textLen = el.textContent?.length || 0;

        const next = el.nextSibling;
        if (
          next &&
          next.textContent &&
          (next.textContent.trim().startsWith(";") ||
            (ref && next.textContent.includes(ref)))
        ) {
          textLen += next.textContent.length;
        }

        const to = from + textLen;

        // Replace with clean plain text title (no underline, no citation markup, no trailing citation details)
        if (from >= 0 && to >= from) {
          editor
            .chain()
            .focus()
            .deleteRange({ from, to })
            .insertContentAt(from, title)
            .run();
        } else {
          el.remove();
          if (next && next.textContent?.trim().startsWith(";")) {
            next.remove();
          }
          editor.view.dispatch(editor.state.tr);
        }
      }
    } catch {
      try {
        if (el) el.remove();
        editor.view.dispatch(editor.state.tr);
      } catch {
        // Safe
      }
    }

    setActiveCitation(null);
    setIsEditing(false);
    activeElementRef.current = null;
  }, [activeCitation, editor]);

  // Delete entirely (removes both title and citation details completely)
  const handleDeleteEntirely = useCallback(() => {
    const el = activeElementRef.current;
    if (!editor || !editor.view) return;

    const ref = activeCitation?.ref || "";

    try {
      if (el && el.parentNode) {
        const parent = el.parentNode;
        const childIndex = Array.from(parent.childNodes).indexOf(el);
        const from = editor.view.posAtDOM(parent, childIndex);
        let textLen = el.textContent?.length || 0;

        const next = el.nextSibling;
        if (
          next &&
          next.textContent &&
          (next.textContent.trim().startsWith(";") ||
            (ref && next.textContent.includes(ref)))
        ) {
          textLen += next.textContent.length;
        }

        const to = from + textLen;
        if (from >= 0 && to >= from) {
          editor.chain().focus().deleteRange({ from, to }).run();
        } else {
          el.remove();
          if (next && next.textContent?.trim().startsWith(";")) {
            next.remove();
          }
          editor.view.dispatch(editor.state.tr);
        }
      }
    } catch {
      try {
        if (el) el.remove();
        editor.view.dispatch(editor.state.tr);
      } catch {
        // Safe
      }
    }

    setActiveCitation(null);
    setIsEditing(false);
    activeElementRef.current = null;
  }, [activeCitation, editor]);

  const handleOpenRuling = useCallback(() => {
    if (!activeCitation) return;
    const url =
      activeCitation.url ||
      `https://indiankanoon.org/search/?formInput=${encodeURIComponent(
        activeCitation.title + " " + activeCitation.ref,
      )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [activeCitation]);

  const linkLabel = getCitationLinkLabel(activeCitation?.url);

  return (
    <>
      {/* 1. Small minimal hover pill floating slightly above the citation */}
      {activeCitation && !isEditing && (
        <div
          ref={pillRef}
          onMouseEnter={clearCloseTimeout}
          onMouseLeave={scheduleClose}
          style={{
            position: "fixed",
            top: `${Math.max(10, activeCitation.top - 32)}px`,
            left: `${Math.max(16, activeCitation.left)}px`,
            zIndex: 60,
          }}
          className="flex items-center gap-1 rounded-md border border-stone-200/90 bg-white px-1.5 py-1 shadow-md text-stone-700 select-none animate-in fade-in duration-100"
        >
          <button
            type="button"
            onClick={handleStartEdit}
            title="Edit legal citation"
            className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium text-stone-700 hover:bg-[#edf4fa] hover:text-[#2c5478] transition-colors cursor-pointer"
          >
            <Edit3 className="h-3 w-3 text-[#487aa8]" />
            <span>Edit</span>
          </button>

          <button
            type="button"
            onClick={handleOpenRuling}
            title={`Open judgment in ${linkLabel}`}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-[#487aa8] hover:bg-[#edf4fa] hover:text-[#38648c] transition-colors cursor-pointer"
          >
            <span>{linkLabel}</span>
            <ExternalLink className="h-2.5 w-2.5" />
          </button>

          <div className="h-3 w-px bg-stone-200 mx-0.5" />

          <button
            type="button"
            onClick={handleRemoveCitation}
            title="Remove citation (restore normal text)"
            className="p-1 rounded text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* 2. Clean Minimal Popup Modal - Opens on clicking the small Edit button */}
      {isEditing && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-stone-900/20 backdrop-blur-[1px] animate-in fade-in duration-150"
          onClick={() => setIsEditing(false)}
        >
          <div
            className="w-[360px] rounded-xl border border-stone-200 bg-white p-4 shadow-2xl text-xs select-none animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
              <div className="flex items-center gap-2 font-semibold text-stone-900 text-xs">
                <AtSign className="h-3.5 w-3.5 text-[#487aa8]" />
                <span>Edit Citation</span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-3 pt-3">
              {/* Case Name */}
              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">
                  Case Name
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
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
                  value={editRef}
                  onChange={(e) => setEditRef(e.target.value)}
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
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
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
                  {editTitle.trim() || "Case Name v. Opposing Party"}
                </u>
                ; {editRef.trim() || "AIR 1973 SC 1461"}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleRemoveCitation}
                    title="Remove citation markup and keep text as normal"
                    className="inline-flex items-center gap-1 rounded border border-stone-200 px-2.5 py-1 text-[11px] font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors cursor-pointer"
                  >
                    <span>Remove Citation</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteEntirely}
                    title="Delete entire citation and text completely"
                    className="p-1 rounded text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="rounded border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="inline-flex items-center gap-1 rounded bg-[#487aa8] hover:bg-[#38648c] px-3.5 py-1.5 text-xs font-medium text-white transition-colors cursor-pointer shadow-xs"
                  >
                    <Check className="h-3 w-3" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
