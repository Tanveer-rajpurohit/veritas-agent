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
import { DraftingBottomBar } from "../../../components/drafting/drafting-bottom-bar";
import { DraftingCanvas } from "../../../components/drafting/drafting-canvas";
import { DraftingHeader } from "../../../components/drafting/drafting-header";
import { DraftingToolbar } from "../../../components/drafting/drafting-toolbar";
import { FontSizeExtension } from "../../../lib/draft/font-size-extension";
import { CitationExtension } from "../../../lib/draft/citation-extension";
import { exportAsDocx, exportAsMarkdown, printDocument } from "../../../lib/draft/export-document";
import { useDocument, useDocumentVersions, useSaveVersion, useUpdateDocument } from "../../../hooks/documents/useDocuments";
import type { DraftSaveStatus, DraftVersion } from "../../../types/draft/types";
import "../../../components/drafting/drafting-editor.css";

export default function DraftingIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: documentId } = use(params);
  const router = useRouter();
  const documentQuery = useDocument(documentId);
  const versionsQuery = useDocumentVersions(documentId);
  const saveVersion = useSaveVersion(documentId, documentQuery.data?.matter_id);
  const updateDocument = useUpdateDocument(documentId, documentQuery.data?.matter_id);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [status, setStatus] = useState<DraftSaveStatus>("saved");
  const [zoom, setZoom] = useState(100);
  const [pageCount, setPageCount] = useState(1);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const baseVersionId = useRef<string | null>(null);
  const editSequence = useRef(0);
  const hydrating = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right", "justify"], defaultAlignment: "justify" }),
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
        footerRight: "Page {page}",
        footerLeft: "CONFIDENTIAL · WORKING DRAFT",
      }),
    ],
    content: { type: "doc", content: [{ type: "paragraph" }] },
    editorProps: { attributes: { class: "focus:outline-none min-h-[60vh] mx-auto text-stone-900", spellcheck: "true" } },
  });

  const versions = useMemo(() => versionsQuery.data ?? [], [versionsQuery.data]);
  const latestVersion = versions[0] ?? null;

  useEffect(() => {
    if (!editor || !documentQuery.data || !latestVersion || selectedVersionId) return;
    hydrating.current = true;
    editor.commands.setContent(documentQuery.data.content);
    baseVersionId.current = latestVersion.id;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrates server state into the editor once
    setSelectedVersionId(latestVersion.id);
    editor.setEditable(true);
    hydrating.current = false;
  }, [documentQuery.data, editor, latestVersion, selectedVersionId]);

  const persist = useCallback(async () => {
    if (!editor || !baseVersionId.current || hydrating.current || !editor.isEditable) return;
    const sequence = editSequence.current;
    setStatus("saving");
    try {
      const saved = await saveVersion.mutateAsync({
        payload: {
          base_version_id: baseVersionId.current,
          schema_version: 1,
          content: editor.getJSON(),
          change_summary: "Edited in Veritas drafting workspace",
        },
      });
      baseVersionId.current = saved.id;
      setSelectedVersionId(saved.id);
      setStatus(sequence === editSequence.current ? "saved" : "unsaved");
    } catch {
      setStatus("unsaved");
    }
  }, [editor, saveVersion]);

  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => {
      const text = editor.getText();
      setWordCount(text.trim().split(/\s+/).filter(Boolean).length);
      setCharCount(text.length);
      const pagination = document.querySelector("[data-rm-pagination]");
      setPageCount(Math.max(1, pagination?.children.length ?? 1));
      if (hydrating.current || !editor.isEditable) return;
      editSequence.current += 1;
      setStatus("unsaved");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => void persist(), 1200);
    };
    editor.on("update", onUpdate);
    onUpdate();
    return () => {
      editor.off("update", onUpdate);
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [editor, persist]);

  const headerVersions = useMemo<DraftVersion[]>(() => versions.map((version) => ({
    version: `v${version.version_no}`,
    versionId: version.id,
    label: `Version ${version.version_no}`,
    date: version.id === latestVersion?.id ? "Current" : "Read only",
    summary: "Immutable saved version",
    pages: [],
  })), [latestVersion?.id, versions]);

  function handleVersionChange(versionKey: string) {
    if (!editor) return;
    const version = versions.find((item) => `v${item.version_no}` === versionKey);
    if (!version) return;
    hydrating.current = true;
    editor.commands.setContent(version.content);
    setSelectedVersionId(version.id);
    editor.setEditable(version.id === latestVersion?.id);
    baseVersionId.current = latestVersion?.id ?? version.id;
    setStatus("saved");
    hydrating.current = false;
  }

  async function handleTitleChange(title: string) {
    await updateDocument.mutateAsync({ title });
  }

  if (documentQuery.isLoading || versionsQuery.isLoading) {
    return <div className="flex h-screen items-center justify-center bg-[#eaf0f6] text-sm text-[#52697c]">Opening the saved draft…</div>;
  }
  if (documentQuery.error || versionsQuery.error || !documentQuery.data || !latestVersion) {
    return <div className="flex h-screen flex-col items-center justify-center gap-3 bg-[#eaf0f6] p-6 text-center"><h1 className="m-0 text-xl font-semibold text-[#183f60]">Draft unavailable</h1><p className="m-0 max-w-md text-sm text-[#60788c]">This draft does not exist or your account cannot access its Matter.</p><button type="button" onClick={() => router.push("/workspace")} className="rounded-lg bg-[#487aa8] px-4 py-2 text-sm font-semibold text-white">Return to workspace</button></div>;
  }

  const selectedVersion = versions.find((item) => item.id === selectedVersionId) ?? latestVersion;
  const selectedVersionKey = `v${selectedVersion.version_no}`;
  const html = editor?.getHTML() ?? "";

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#eaf0f6] select-text">
      <DraftingHeader
        title={documentQuery.data.title}
        onTitleChange={(title) => void handleTitleChange(title)}
        currentVersion={selectedVersionKey}
        versions={headerVersions}
        onVersionChange={handleVersionChange}
        status={status}
        onBack={() => router.back()}
        onExportDocx={() => exportAsDocx(documentQuery.data.title, html)}
        onPrintPdf={() => printDocument(documentQuery.data.title, html)}
        onExportMarkdown={() => exportAsMarkdown(documentQuery.data.title, html)}
      />
      {!editor?.isEditable && <div className="bg-amber-50 px-4 py-1.5 text-center text-xs font-medium text-amber-800">You are viewing an older immutable version. Return to the current version to edit.</div>}
      <DraftingToolbar editor={editor} zoom={zoom} onZoomChange={setZoom} />
      <DraftingCanvas editor={editor} zoom={zoom} />
      <DraftingBottomBar pageCount={pageCount} wordCount={wordCount} charCount={charCount} zoom={zoom} onZoomChange={setZoom} onFitWidth={() => setZoom(90)} />
    </div>
  );
}
