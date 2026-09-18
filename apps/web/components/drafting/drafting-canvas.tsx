"use client";

import { EditorContent, type Editor } from "@tiptap/react";

interface DraftingCanvasProps {
  editor: Editor | null;
  zoom: number;
}

const BASE_A4_WIDTH = 794;

function DraftingDocumentSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto bg-[#eaf0f6] py-8 pb-32">
      <div className="mx-auto w-[794px] min-h-[1123px] bg-white rounded-[4px] border border-stone-200/90 shadow-xl p-12 space-y-7 animate-pulse">
        {/* Running Header */}
        <div className="flex justify-between items-center border-b border-stone-200 pb-3">
          <div className="h-3 w-56 bg-stone-200 rounded" />
          <div className="h-3 w-20 bg-stone-200 rounded" />
        </div>

        {/* Cause Title & Forum Center */}
        <div className="space-y-2.5 py-4 border-b border-stone-200 flex flex-col items-center">
          <div className="h-3.5 w-72 bg-stone-200 rounded" />
          <div className="h-3 w-48 bg-stone-200 rounded" />
          <div className="h-3 w-60 bg-stone-200 rounded" />
        </div>

        {/* Heading Section 1 */}
        <div className="pt-2">
          <div className="h-4 w-72 bg-stone-300 rounded" />
        </div>

        {/* Paragraph 1 */}
        <div className="space-y-2.5">
          <div className="h-3 w-full bg-stone-200 rounded" />
          <div className="h-3 w-[96%] bg-stone-200 rounded" />
          <div className="h-3 w-[91%] bg-stone-200 rounded" />
          <div className="h-3 w-[84%] bg-stone-200 rounded" />
        </div>

        {/* Heading Section 2 */}
        <div className="pt-3">
          <div className="h-4 w-64 bg-stone-300 rounded" />
        </div>

        {/* Paragraph 2 */}
        <div className="space-y-2.5">
          <div className="h-3 w-[98%] bg-stone-200 rounded" />
          <div className="h-3 w-[93%] bg-stone-200 rounded" />
          <div className="h-3 w-[88%] bg-stone-200 rounded" />
        </div>

        {/* Citation Authority Box */}
        <div className="p-4 bg-stone-50 border-l-4 border-stone-300 rounded-r space-y-2">
          <div className="h-3.5 w-64 bg-stone-300 rounded" />
          <div className="h-3 w-80 bg-stone-200 rounded" />
          <div className="h-2.5 w-48 bg-stone-200 rounded" />
        </div>

        {/* Heading Section 3 */}
        <div className="pt-3">
          <div className="h-4 w-52 bg-stone-300 rounded" />
        </div>

        {/* Paragraph 3 */}
        <div className="space-y-2.5">
          <div className="h-3 w-[95%] bg-stone-200 rounded" />
          <div className="h-3 w-[89%] bg-stone-200 rounded" />
          <div className="h-3 w-[72%] bg-stone-200 rounded" />
        </div>
      </div>
    </div>
  );
}

export function DraftingCanvas({ editor, zoom }: DraftingCanvasProps) {
  const scale = zoom / 100;

  if (!editor) {
    return <DraftingDocumentSkeleton />;
  }

  return (
    <div
      className="flex-1 overflow-y-auto overflow-x-hidden bg-[#eaf0f6] py-8 pb-32 relative select-text [scrollbar-width:thin]"
      style={{
        WebkitOverflowScrolling: "touch",
        touchAction: "pan-y",
        overscrollBehavior: "contain",
      }}
    >
      <div
        className="mx-auto flex justify-center origin-top transition-transform duration-75"
        style={{
          transform: `scale(${scale})`,
          width: "100%",
          minWidth: `${BASE_A4_WIDTH}px`,
          transformOrigin: "top center",
        }}
      >
        <div
          className="bg-transparent mx-auto"
          style={{ width: `${BASE_A4_WIDTH}px` }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
