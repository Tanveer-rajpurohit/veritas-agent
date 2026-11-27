"use client";

import { useState, useRef, useEffect } from "react";
import type { Matter } from "../../types/workspace/types";
import {
  ArrowUpIcon,
  PaperclipIcon,
  FolderKanbanIcon,
  SearchIcon,
  CheckIcon,
  ChevronDownIcon,
  XIcon,
  SparklesIcon,
  ColoredFileIcon,
} from "../workspace/workspace-icons";

export interface AttachedFile {
  id: string;
  name: string;
  size?: string;
  type?: string;
}

interface AgentComposerProps {
  input: string;
  setInput: (value: string) => void;
  onSubmit: (data: {
    prompt: string;
    matterId: string | null;
    attachedFiles: AttachedFile[];
    template?: string;
  }) => void;
  isBusy: boolean;
  matters: Matter[];
  selectedMatterId: string | null;
  onSelectMatterId: (id: string | null) => void;
  attachedFiles: AttachedFile[];
  onAddAttachedFile: (file: AttachedFile) => void;
  onRemoveAttachedFile: (id: string) => void;
}

const QUICK_PROMPTS = [
  "Draft IBC Section 7 Form 1 Application",
  "Audit Ledger & Default Dates in Annexure B",
  "Check Article 137 Limitation Bar & Section 18",
  "Draft Synopsis & Chronological List of Dates",
];

export function AgentComposer({
  input,
  setInput,
  onSubmit,
  isBusy,
  matters,
  selectedMatterId,
  onSelectMatterId,
  attachedFiles,
  onAddAttachedFile,
  onRemoveAttachedFile,
}: AgentComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [matterDropdownOpen, setMatterDropdownOpen] = useState(false);
  const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false);
  const [matterSearch, setMatterSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        180,
      )}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if ((!input.trim() && attachedFiles.length === 0) || isBusy) return;
    onSubmit({
      prompt: input.trim(),
      matterId: selectedMatterId,
      attachedFiles,
      template: selectedTemplate || undefined,
    });
    setInput("");
    setSelectedTemplate(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;
      onAddAttachedFile({
        id: `attached-${Date.now()}-${i}`,
        name: file.name,
        size: `${(file.size / 1024).toFixed(0)} KB`,
        type: file.type || "document",
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const filteredMatters = matters.filter((m) =>
    m.name.toLowerCase().includes(matterSearch.toLowerCase()) ||
    m.caseNumber.toLowerCase().includes(matterSearch.toLowerCase())
  );

  const selectedMatter = matters.find((m) => m.id === selectedMatterId);

  return (
    <div className="relative mx-auto w-full max-w-3xl px-3 pb-3 select-none">
      <div className="flex flex-wrap gap-1.5 pb-2">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => setInput(prompt)}
            className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-white/90 px-3 py-1 text-[11px] font-medium text-stone-600 shadow-2xs hover:border-[#cbe0f2] hover:bg-[#edf4fa] hover:text-[#2c5478] cursor-pointer transition-all"
          >
            <SparklesIcon size={11} className="text-[#487aa8]" />
            <span>{prompt}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col rounded-xl border border-stone-200/90 bg-white shadow-md focus-within:border-[#487aa8] focus-within:ring-2 focus-within:ring-[#487aa8]/15 transition-all">
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-stone-100 p-2.5">
            {attachedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-1.5 rounded-md bg-[#edf4fa] px-2.5 py-1 text-xs text-[#2c5478] border border-[#cbe0f2]"
              >
                <ColoredFileIcon filename={file.name} format={file.type} size="xs" />
                <span className="font-medium max-w-[200px] truncate">
                  {file.name}
                </span>
                {file.size && (
                  <span className="text-[10px] text-stone-400 font-mono">
                    {file.size}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onRemoveAttachedFile(file.id)}
                  aria-label={`Remove ${file.name}`}
                  className="text-stone-400 hover:text-stone-700 ml-0.5 cursor-pointer"
                >
                  <XIcon size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Veritas Agent or ask to draft, verify citations, audit ledgers... (Enter to send, Shift+Enter for new line)"
          rows={2}
          aria-label="Agent prompt input"
          className="w-full resize-none border-none bg-transparent px-3.5 pt-3 pb-2 text-[13.5px] text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-0 leading-relaxed font-sans"
        />

        <div className="flex items-center justify-between border-t border-stone-100 px-3 py-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
              aria-label="Upload document directly"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach documents"
              className="flex h-7.5 items-center gap-1.5 rounded-md border border-stone-200 bg-white px-2.5 text-xs font-medium text-stone-600 hover:bg-[#edf4fa] hover:text-[#487aa8] cursor-pointer transition-colors shadow-2xs"
            >
              <PaperclipIcon size={12} className="text-stone-500" />
              <span>Attach</span>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setMatterDropdownOpen(!matterDropdownOpen);
                  setTemplateDropdownOpen(false);
                }}
                aria-expanded={matterDropdownOpen}
                className={`flex h-7.5 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors cursor-pointer shadow-2xs ${
                  selectedMatter
                    ? "border-[#cbe0f2] bg-[#edf4fa] text-[#2c5478]"
                    : "border-stone-200 bg-white text-stone-600 hover:bg-[#edf4fa] hover:text-[#487aa8]"
                }`}
              >
                <FolderKanbanIcon
                  size={12}
                  className={selectedMatter ? "text-[#487aa8]" : "text-stone-500"}
                />
                <span className="max-w-[170px] truncate">
                  {selectedMatter ? selectedMatter.name : "All Matters"}
                </span>
                <ChevronDownIcon
                  size={11}
                  className={`transition-transform ${
                    matterDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {matterDropdownOpen && (
                <div className="absolute bottom-full left-0 mb-1.5 w-72 rounded-md border border-stone-200 bg-white p-1.5 shadow-xl z-50">
                  <div className="flex items-center gap-1.5 border-b border-stone-100 px-2 py-1.5">
                    <SearchIcon size={12} className="text-stone-400" />
                    <input
                      type="text"
                      value={matterSearch}
                      onChange={(e) => setMatterSearch(e.target.value)}
                      placeholder="Search matters..."
                      className="w-full text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none"
                    />
                  </div>

                  <div className="max-h-52 overflow-y-auto py-1">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectMatterId(null);
                        setMatterDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                        selectedMatterId === null
                          ? "bg-[#edf4fa] text-[#2c5478] font-semibold"
                          : "hover:bg-stone-50 text-stone-700"
                      }`}
                    >
                      <div>
                        <p className="font-medium">All Matters</p>
                        <p className="text-[10px] text-stone-400 font-mono">
                          Entire workspace scope
                        </p>
                      </div>
                      {selectedMatterId === null && (
                        <CheckIcon size={12} className="text-[#487aa8]" />
                      )}
                    </button>

                    {filteredMatters.map((matter) => (
                      <button
                        key={matter.id}
                        type="button"
                        onClick={() => {
                          onSelectMatterId(matter.id);
                          setMatterDropdownOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                          selectedMatterId === matter.id
                            ? "bg-[#edf4fa] text-[#2c5478] font-semibold"
                            : "hover:bg-stone-50 text-stone-700"
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="font-medium truncate">{matter.name}</p>
                          <p className="text-[10px] text-stone-400 font-mono truncate">
                            {matter.caseNumber} · {matter.practiceArea}
                          </p>
                        </div>
                        {selectedMatterId === matter.id && (
                          <CheckIcon size={12} className="text-[#487aa8] shrink-0" />
                        )}
                      </button>
                    ))}

                    {filteredMatters.length === 0 && (
                      <div className="px-2 py-2 text-center text-xs text-stone-400">
                        No matters found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setTemplateDropdownOpen(!templateDropdownOpen);
                  setMatterDropdownOpen(false);
                }}
                aria-expanded={templateDropdownOpen}
                className={`flex h-7.5 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors cursor-pointer shadow-2xs ${
                  selectedTemplate
                    ? "border-[#cbe0f2] bg-[#edf4fa] text-[#2c5478]"
                    : "border-stone-200 bg-white text-stone-600 hover:bg-[#edf4fa] hover:text-[#487aa8]"
                }`}
              >
                <SparklesIcon
                  size={12}
                  className={selectedTemplate ? "text-[#487aa8]" : "text-stone-500"}
                />
                <span className="max-w-[140px] truncate">
                  {selectedTemplate || "Template"}
                </span>
                <ChevronDownIcon
                  size={11}
                  className={`transition-transform ${
                    templateDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {templateDropdownOpen && (
                <div className="absolute bottom-full left-0 mb-1.5 w-64 rounded-md border border-stone-200 bg-white p-1.5 shadow-xl z-50">
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase font-mono text-stone-400">
                    Drafting Templates
                  </div>
                  {[
                    "IBC Section 7 Form 1",
                    "Limitation Rejoinder (Art 137)",
                    "Synopsis & List of Dates",
                    "Section 9 Injunction Petition",
                  ].map((tpl) => (
                    <button
                      key={tpl}
                      type="button"
                      onClick={() => {
                        setSelectedTemplate(tpl);
                        setTemplateDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                        selectedTemplate === tpl
                          ? "bg-[#edf4fa] text-[#2c5478] font-semibold"
                          : "hover:bg-stone-50 text-stone-700"
                      }`}
                    >
                      <span>{tpl}</span>
                      {selectedTemplate === tpl && (
                        <CheckIcon size={12} className="text-[#487aa8]" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={(!input.trim() && attachedFiles.length === 0) || isBusy}
            aria-label="Send message"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#487aa8] text-white hover:bg-[#3b668f] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
          >
            {isBusy ? (
              <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <ArrowUpIcon size={15} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
