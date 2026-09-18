"use client";

import { useMemo } from "react";
import type { Editor } from "@tiptap/react";
import {
  ListTree,
  ChevronRight,
  Paperclip,
  BookOpen,
} from "lucide-react";
import { WordDocIcon, PdfDocIcon } from "./file-type-icons";

interface HeadingItem {
  id: string;
  pos: number;
  text: string;
  level: number;
}

interface LinkedDocItem {
  id: string;
  title: string;
  type: "pdf" | "docx";
  date: string;
  badge?: string;
}

interface DraftingSidebarProps {
  editor: Editor | null;
  isOpen: boolean;
  onToggle: () => void;
  matterName?: string;
  caseNumber?: string;
}

const LINKED_DOCS_SEED: LinkedDocItem[] = [
  {
    id: "doc-1",
    title: "Facility Agreement (Tranche-II)",
    type: "docx",
    date: "12 Jan 2019",
    badge: "Annexure A",
  },
  {
    id: "doc-2",
    title: "Audited Financials FY 2021-22",
    type: "pdf",
    date: "31 Mar 2022",
    badge: "Sec 18 Defense",
  },
  {
    id: "doc-3",
    title: "Default & Ledger Amortization",
    type: "pdf",
    date: "14 Aug 2021",
    badge: "Annexure B-4",
  },
  {
    id: "doc-4",
    title: "Form 2 IRP Written Consent",
    type: "docx",
    date: "04 Sep 2026",
    badge: "Annexure A-1",
  },
];

export function DraftingSidebar({
  editor,
  isOpen,
  onToggle,
  matterName = "Arora v. Meridian Estates Pvt. Ltd.",
  caseNumber = "ARB.P. 428/2026",
}: DraftingSidebarProps) {
  const doc = editor?.state.doc;
  const outline = useMemo(() => {
    if (!editor || !doc) return [];

    const items: HeadingItem[] = [];
    doc.descendants((node, pos) => {
      if (node.type.name === "heading") {
        const text = node.textContent.trim();
        if (text) {
          items.push({
            id: `pos-${pos}`,
            pos,
            text,
            level: node.attrs.level || 1,
          });
        }
      }
    });
    return items;
  }, [editor, doc]);

  const scrollToHeading = (pos: number) => {
    if (!editor) return;
    editor.chain().focus().setTextSelection(pos + 1).scrollIntoView().run();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <aside
      className="flex w-64 shrink-0 flex-col overflow-hidden border-r border-[#cbe0f2] bg-white text-stone-800 select-none z-20 shadow-xs"
      aria-label="Document Outline and Sources"
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between border-b border-stone-200 px-3.5 py-2.5 bg-stone-50/60">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="h-3.5 w-3.5 text-[#487aa8] shrink-0" />
          <span className="text-xs font-semibold text-stone-900 truncate">
            Document Explorer
          </span>
        </div>
        <button
          type="button"
          onClick={onToggle}
          title="Collapse sidebar"
          className="flex h-6 w-6 items-center justify-center rounded text-stone-400 hover:bg-stone-200 hover:text-stone-700 transition-colors cursor-pointer"
        >
          <ChevronRight className="h-3.5 w-3.5 rotate-180" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
        {/* Section 1: Table of Content / Smart Outline */}
        <div className="p-3">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-700 uppercase tracking-wider font-mono">
              <ListTree className="h-3 w-3 text-[#487aa8]" />
              <span>Table of Content</span>
            </div>
            <span className="text-[10px] text-stone-400 font-mono">
              {outline.length}
            </span>
          </div>

          {outline.length === 0 ? (
            <p className="text-[11.5px] text-stone-400 italic py-2">
              Headings in your draft will automatically appear here.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {outline.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => scrollToHeading(item.pos)}
                    style={{
                      paddingLeft: `${Math.max(0, item.level - 1) * 12 + 6}px`,
                    }}
                    className="flex w-full items-center gap-1.5 rounded py-1 pr-1.5 text-left text-[11.5px] text-stone-700 hover:bg-[#edf4fa] hover:text-[#2c5478] transition-colors cursor-pointer group"
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                        item.level === 1
                          ? "bg-[#487aa8]"
                          : item.level === 2
                            ? "bg-stone-400"
                            : "bg-stone-300"
                      }`}
                    />
                    <span className="truncate flex-1 font-medium group-hover:underline">
                      {item.text}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Section 2: Linked Documents / Evidence */}
        <div className="p-3">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-700 uppercase tracking-wider font-mono">
              <Paperclip className="h-3 w-3 text-[#487aa8]" />
              <span>Linked Documents</span>
            </div>
            <span className="text-[10px] text-stone-400 font-mono">
              {LINKED_DOCS_SEED.length}
            </span>
          </div>

          <div className="space-y-1.5">
            {LINKED_DOCS_SEED.map((doc) => (
              <div
                key={doc.id}
                className="group flex items-start gap-2.5 rounded-lg border border-stone-200/80 p-2 hover:border-[#cbe0f2] hover:bg-[#f7fbfe] transition-colors"
              >
                <div className="mt-0.5 shrink-0">
                  {doc.type === "pdf" ? (
                    <PdfDocIcon size={18} />
                  ) : (
                    <WordDocIcon size={18} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11.5px] font-medium text-stone-900 truncate group-hover:text-[#2c5478]">
                      {doc.title}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between text-[10px] text-stone-400 font-mono">
                    <span>{doc.date}</span>
                    {doc.badge && (
                      <span className="rounded bg-[#edf4fa] px-1 py-0.2 text-[#2c5478] font-medium">
                        {doc.badge}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar Footer Matter Pill */}
      <div className="border-t border-stone-200 p-2.5 bg-stone-50/50 text-[10.5px]">
        <div className="font-semibold text-stone-700 truncate">{matterName}</div>
        <div className="text-stone-400 font-mono text-[9.5px] mt-0.5">{caseNumber}</div>
      </div>
    </aside>
  );
}
