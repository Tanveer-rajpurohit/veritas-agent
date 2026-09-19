"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Matter } from "../../types/workspace/types";
import { CustomSelect, type SelectOption } from "./custom-select";
import {
  XIcon,
  UploadIcon,
  ShieldCheckIcon,
  ColoredFileIcon,
} from "./workspace-icons";

export type EvidenceType = "Pleadings" | "Evidence" | "Orders" | "Contracts";

interface UploadDocumentModalProps {
  open: boolean;
  onClose: () => void;
  onUpload: (data: {
    name: string;
    type: EvidenceType;
    matterId?: string;
    file?: File | null;
  }) => Promise<void> | void;
  matters?: Matter[];
  preselectedMatterId?: string;
}

const CATEGORY_OPTIONS: SelectOption<EvidenceType>[] = [
  {
    value: "Evidence",
    label: "Evidence / Financial Ledger",
    description: "Bank statements, NeSL defaults, forensic audits",
    badge: "Source Record",
  },
  {
    value: "Pleadings",
    label: "Pleadings / Form 1 Petition",
    description: "IBC Section 7/9 filings, counter-claims, plaints",
    badge: "Pleading",
  },
  {
    value: "Contracts",
    label: "Contracts / Facility Agreement",
    description: "Syndicated loan covenants, master contracts, guarantees",
    badge: "Contract",
  },
  {
    value: "Orders",
    label: "Orders / Interim Decrees",
    description: "NCLT/NCLAT restraint orders, High Court directives",
    badge: "Judicial",
  },
];

export function UploadDocumentModal({
  open,
  onClose,
  onUpload,
  matters = [],
  preselectedMatterId,
}: UploadDocumentModalProps) {
  const formId = useId();
  const [docName, setDocName] = useState("");
  const [category, setCategory] = useState<EvidenceType>("Evidence");
  const [selectedMatterId, setSelectedMatterId] = useState<string>(
    preselectedMatterId || (matters[0]?.id ?? ""),
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [matters, onClose, open, preselectedMatterId]);

  if (!open) return null;

  const matterOptions: SelectOption[] = matters.map((m) => ({
    value: m.id,
    label: m.name,
    description: `${m.caseNumber} · ${m.court}`,
    badge: m.matterType,
  }));
  const effectiveMatterId =
    selectedMatterId || preselectedMatterId || (matters[0]?.id ?? "");

  function handleFileChange(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file) return;
    setSelectedFile(file);
    if (!docName.trim()) {
      setDocName(file.name);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile || !effectiveMatterId || isUploading) return;

    const finalName = docName.trim() || selectedFile.name;

    setIsUploading(true);
    setUploadError(null);
    try {
      await onUpload({
        name: finalName,
        type: category,
        matterId: effectiveMatterId,
        file: selectedFile,
      });
      setDocName("");
      setSelectedFile(null);
      onClose();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-stone-950/40 p-4 backdrop-blur-xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${formId}-title`}
        aria-describedby={`${formId}-description`}
        className="relative my-auto w-full max-w-xl overflow-visible rounded-xl border border-stone-200/90 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 sm:max-w-2xl sm:p-8"
      >
        <div className="flex items-start justify-between pb-4 border-b border-stone-100">
          <div>
            <h2
              id={`${formId}-title`}
              className="m-0 font-sans text-base font-semibold text-stone-900 sm:text-lg"
            >
              Add Documents
            </h2>
            <p
              id={`${formId}-description`}
              className="m-0 pt-1 text-xs leading-relaxed text-stone-500"
            >
              Upload a source record, agreement, order, or pleading to the
              selected matter.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close add documents dialog"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors cursor-pointer shrink-0 ml-4"
          >
            <XIcon size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4.5 pt-5">
          {matters.length > 1 && !preselectedMatterId && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-stone-700">
                Target matter
              </label>
              <CustomSelect
                value={effectiveMatterId}
                onChange={setSelectedMatterId}
                options={matterOptions}
                placeholder="Select a matter"
                ariaLabel="Target matter"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`${formId}-document-title`}
                className="text-xs font-semibold text-stone-700"
              >
                Document title
              </label>
              <input
                type="text"
                required
                id={`${formId}-document-title`}
                name="document-title"
                autoComplete="off"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="Syndicated Facility Agreement.pdf…"
                className="h-10 w-full rounded-lg border border-stone-200/90 bg-white px-3.5 text-xs text-stone-900 shadow-2xs transition-[border-color,box-shadow] placeholder:text-stone-400 focus-visible:border-[#487aa8] focus-visible:ring-2 focus-visible:ring-[#487aa8]/15 focus-visible:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-stone-700">
                Document type
              </label>
              <CustomSelect<EvidenceType>
                value={category}
                onChange={setCategory}
                options={CATEGORY_OPTIONS}
                ariaLabel="Document type"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-stone-700">
              Source File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              id={`${formId}-source-file`}
              name="source-file"
              accept=".pdf,.txt,.md"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files)}
            />

            <div
              role="button"
              tabIndex={0}
              aria-label={
                selectedFile
                  ? `Change selected file ${selectedFile.name}`
                  : "Choose a source file"
              }
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-[background-color,border-color,box-shadow] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#487aa8]/20 focus-visible:outline-none ${
                isDragging
                  ? "border-[#487aa8] bg-[#edf4fa]/60"
                  : selectedFile
                    ? "border-[#487aa8]/50 bg-[#f8fbfe]"
                    : "border-stone-200/90 bg-stone-50/40 hover:border-[#487aa8]/40 hover:bg-[#edf4fa]/30"
              }`}
            >
              {selectedFile ? (
                <div className="flex items-center gap-3 w-full max-w-sm">
                  <ColoredFileIcon
                    filename={selectedFile.name}
                    category={category}
                    size="md"
                  />
                  <div className="min-w-0 flex-1 text-left">
                    <p className="m-0 text-xs font-semibold text-stone-900 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="m-0 text-[11px] text-stone-500 font-mono pt-0.5">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB ·
                      Ready to upload
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                    className="ml-2 rounded-md p-1 text-stone-400 hover:bg-stone-200/60 hover:text-stone-700 cursor-pointer shrink-0"
                  >
                    <XIcon size={13} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-3">
                    <ColoredFileIcon format="PDF" size="sm" />
                    <ColoredFileIcon format="TXT" size="sm" />
                    <ColoredFileIcon format="MD" size="sm" />
                  </div>
                  <p className="m-0 text-xs font-semibold text-stone-800">
                    Drop your legal file here, or{" "}
                    <span className="text-[#487aa8] underline underline-offset-2">
                      browse files
                    </span>
                  </p>
                  <p className="m-0 pt-1 text-[11px] text-stone-400">
                    PDF, TXT, or Markdown up to 10 MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {uploadError && (
            <p role="alert" className="m-0 text-xs font-medium text-rose-700">
              {uploadError}
            </p>
          )}

          <div className="flex items-start gap-2.5 rounded-lg border border-[#cbe0f2] bg-[#f8fbfe] p-3 text-[11px] text-stone-600 leading-relaxed">
            <ShieldCheckIcon
              size={15}
              className="shrink-0 text-[#487aa8] mt-0.5"
            />
            <span>
              Veritas keeps the uploaded file as a source record and links later
              findings back to its extracted pages. Review the extracted text
              before relying on it in a draft.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="h-9.5 rounded-lg border border-stone-200 bg-white px-4 text-xs font-medium text-stone-700 shadow-2xs hover:bg-stone-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedFile || !effectiveMatterId || isUploading}
              className="inline-flex h-9.5 items-center gap-1.5 rounded-lg bg-[#487aa8] px-5 text-xs font-semibold text-white shadow-2xs transition-[background-color,opacity] hover:bg-[#3b668e] focus-visible:ring-2 focus-visible:ring-[#487aa8] focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
            >
              <UploadIcon size={13} />
              <span>{isUploading ? "Uploading…" : "Add Document"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
