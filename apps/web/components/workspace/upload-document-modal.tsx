"use client";

import { useState, useRef } from "react";
import type { Matter } from "../../types/workspace/types";
import { CustomSelect, type SelectOption } from "./custom-select";
import {
  XIcon,
  UploadIcon,
  FileTextIcon,
  ShieldCheckIcon,
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
  }) => void;
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
  const [docName, setDocName] = useState("");
  const [category, setCategory] = useState<EvidenceType>("Evidence");
  const [selectedMatterId, setSelectedMatterId] = useState<string>(
    preselectedMatterId || (matters[0]?.id ?? "")
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const matterOptions: SelectOption[] = matters.map((m) => ({
    value: m.id,
    label: m.name,
    description: `${m.caseNumber} · ${m.court}`,
    badge: m.matterType,
  }));

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const finalName = docName.trim() || selectedFile?.name || "Untitled_Evidence.pdf";

    onUpload({
      name: finalName,
      type: category,
      matterId: selectedMatterId,
      file: selectedFile,
    });

    setDocName("");
    setSelectedFile(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 p-4 backdrop-blur-xs select-none overflow-y-auto">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl sm:max-w-2xl rounded-xl border border-stone-200/90 bg-white p-7 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-visible my-auto"
      >
        <div className="flex items-start justify-between pb-4 border-b border-stone-100">
          <div>
            <h2 className="font-sans text-base sm:text-lg font-semibold text-stone-900 m-0">
              Upload Evidentiary Document
            </h2>
            <p className="text-xs text-stone-500 m-0 pt-1 leading-relaxed">
              Ingest primary PDF records, banking ledgers, and agreements for automated OCR span indexing.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors cursor-pointer shrink-0 ml-4"
          >
            <XIcon size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4.5 pt-5">
          {matters.length > 1 && !preselectedMatterId && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-stone-700">
                Target Legal Matter
              </label>
              <CustomSelect
                value={selectedMatterId}
                onChange={setSelectedMatterId}
                options={matterOptions}
                placeholder="Select a legal matter"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-stone-700">
                Document Title
              </label>
              <input
                type="text"
                required
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="e.g. Syndicated_Facility_Agreement.pdf"
                className="h-10 w-full rounded-lg border border-stone-200/90 bg-white px-3.5 text-xs text-stone-900 placeholder:text-stone-400 shadow-2xs outline-none transition-all focus:border-[#487aa8] focus:ring-3 focus:ring-[#487aa8]/10"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-stone-700">
                Evidence Category
              </label>
              <CustomSelect<EvidenceType>
                value={category}
                onChange={setCategory}
                options={CATEGORY_OPTIONS}
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
              accept=".pdf,.docx,.xlsx,.txt"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files)}
            />

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${
                isDragging
                  ? "border-[#487aa8] bg-[#edf4fa]/60"
                  : selectedFile
                    ? "border-[#487aa8]/50 bg-[#f8fbfe]"
                    : "border-stone-200/90 bg-stone-50/40 hover:border-[#487aa8]/40 hover:bg-[#edf4fa]/30"
              }`}
            >
              {selectedFile ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#edf4fa] text-[#487aa8] border border-[#cbe0f2]">
                    <FileTextIcon size={18} />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="m-0 text-xs font-semibold text-stone-900 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="m-0 text-[11px] text-stone-500 font-mono pt-0.5">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Ready for OCR
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                    className="ml-3 rounded-md p-1 text-stone-400 hover:bg-stone-200/60 hover:text-stone-700 cursor-pointer"
                  >
                    <XIcon size={13} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#edf4fa] text-[#487aa8] mb-2 border border-[#cbe0f2]">
                    <UploadIcon size={18} />
                  </div>
                  <p className="m-0 text-xs font-semibold text-stone-800">
                    Drop your legal file here, or{" "}
                    <span className="text-[#487aa8] underline underline-offset-2">browse files</span>
                  </p>
                  <p className="m-0 pt-1 text-[11px] text-stone-400">
                    Supports PDF, DOCX, XLSX up to 100MB
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-lg border border-[#cbe0f2] bg-[#f8fbfe] p-3 text-[11px] text-stone-600 leading-relaxed">
            <ShieldCheckIcon size={15} className="shrink-0 text-[#487aa8] mt-0.5" />
            <span>
              Uploaded files are stored as immutable evidentiary source records. Veritas OCR performs character-level indexing to produce verifiable candidate spans without modifying your original document.
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
              className="inline-flex h-9.5 items-center gap-1.5 rounded-lg bg-[#487aa8] px-5 text-xs font-semibold text-white shadow-2xs hover:bg-[#3b668e] transition-all cursor-pointer"
            >
              <UploadIcon size={13} />
              <span>Upload & Index Spans</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
