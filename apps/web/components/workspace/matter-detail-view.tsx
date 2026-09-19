"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { gsap } from "gsap";
import type { Matter } from "../../types/workspace/types";
import { CustomSelect, type SelectOption } from "./custom-select";
import {
  UploadDocumentModal,
  type EvidenceType,
} from "./upload-document-modal";
import {
  ArrowLeftIcon,
  CheckIcon,
  DownloadIcon,
  ExternalLinkIcon,
  EyeIcon,
  PlusIcon,
  SearchIcon,
  BotIcon,
  UploadIcon,
  XIcon,
  AlertCircleIcon,
  ColoredFileIcon,
  FileTextIcon,
  FolderKanbanIcon,
} from "./workspace-icons";
import {
  useCreateDocument,
  useDocuments,
} from "../../hooks/documents/useDocuments";
import {
  useDownloadSource,
  useSources,
  useUploadSource,
} from "../../hooks/sources/useSources";
import { useWorkspaceStore } from "../../stores/useWorkspaceStore";

interface MatterDetailViewProps {
  matter: Matter;
  onBack: () => void;
  onSendToAgent?: (item: { title: string; type: "document" | "draft" }) => void;
}

interface DocumentItem {
  id: string;
  name: string;
  type: "Pleadings" | "Evidence" | "Orders" | "Contracts";
  pages: number;
  size: string;
  uploadedAt: string;
  format: "PDF" | "TXT" | "MD";
  hasDiscrepancy?: boolean;
}

interface DraftItem {
  id: string;
  title: string;
  summary: string;
  templateType: string;
  citationsCount: number;
  lastEdited: string;
  version: string;
  status: "Working Draft" | "Review Needed" | "Eligible for Export";
}

type HumanDecision = "accepted" | "rejected";

interface FindingItem {
  id: string;
  dimension:
    | "Quotation"
    | "Identity"
    | "Proposition Support"
    | "Subsequent Treatment"
    | "Fact Consistency";
  agent: "Citation Reviewer" | "Fact Reviewer";
  status: "Supported" | "Contradicted";
  title: string;
  citationOrSource: string;
  proposition: string;
  bench?: string;
  detail: string;
  humanDecision?: {
    action: HumanDecision;
    reason?: string;
  };
}

const TEMPLATE_OPTIONS: SelectOption[] = [
  {
    value: "IBC Section 7 Application (Form 1)",
    label: "IBC Section 7 Application (Form 1)",
    description:
      "Financial Creditor petition initiating CIRP against Corporate Debtor",
    badge: "Insolvency",
  },
  {
    value: "Rejoinder on Limitation under Article 137",
    label: "Rejoinder on Limitation under Article 137",
    description:
      "Countering 3-year bar via balance sheet acknowledgment (Sec 18)",
    badge: "Pleadings",
  },
  {
    value: "Synopsis and Chronological List of Dates",
    label: "Synopsis and Chronological List of Dates",
    description:
      "Sequenced transaction milestones cross-referenced to evidentiary spans",
    badge: "Timeline",
  },
  {
    value: "Section 9 Interim Relief Petition",
    label: "Section 9 Interim Relief Petition",
    description:
      "Arbitration petition for asset freezing and injunction protection",
    badge: "Arbitration",
  },
  {
    value: "IBC Section 9 Operational Debt Application",
    label: "IBC Section 9 Operational Debt Application",
    description: "Operational Creditor claim following Section 8 demand notice",
    badge: "Insolvency",
  },
  {
    value: "Citation Verification & Currency Memo",
    label: "Citation Verification & Currency Memo",
    description:
      "Precedent audit report with negative judicial history checking",
    badge: "Memo",
  },
];

export function MatterDetailView({
  matter,
  onBack,
  onSendToAgent,
}: MatterDetailViewProps) {
  const [activeTab, setActiveTab] = useState<
    "documents" | "drafts" | "forensics"
  >("documents");
  const [docSearchQuery, setDocSearchQuery] = useState("");
  const [docCategoryFilter, setDocCategoryFilter] = useState<string>("all");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [draftModalOpen, setDraftModalOpen] = useState(false);

  const { data: backendDocs } = useDocuments(matter.id);
  const createDocumentMutation = useCreateDocument(matter.id);
  const { data: backendSources } = useSources(matter.id);
  const uploadSourceMutation = useUploadSource();
  const downloadSourceMutation = useDownloadSource();
  const setActiveMatterId = useWorkspaceStore((s) => s.setActiveMatterId);
  const setActiveDocumentId = useWorkspaceStore((s) => s.setActiveDocumentId);

  useEffect(() => {
    setActiveMatterId(matter.id);
  }, [matter.id, setActiveMatterId]);

  const [newDraftTitle, setNewDraftTitle] = useState("");
  const [newDraftTemplate, setNewDraftTemplate] = useState(
    "IBC Section 7 Application (Form 1)",
  );
  const [newDraftPrompt, setNewDraftPrompt] = useState("");

  const navContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const indicatorRef = useRef<HTMLDivElement>(null);

  const documents = useMemo<DocumentItem[]>(() => {
    const backendItems: DocumentItem[] = (backendSources || []).map((source) => ({
      id: source.id,
      name: source.canonical_title,
      type: "Evidence",
      pages: source.page_count ?? 0,
      size: source.extraction_status,
      uploadedAt: `Version ${source.version_number}`,
      format: source.canonical_title.toLowerCase().endsWith(".md")
        ? "MD"
        : source.canonical_title.toLowerCase().endsWith(".txt")
          ? "TXT"
          : "PDF",
    }));

    const combined = backendItems;
    const seen = new Set<string>();
    return combined.filter((d) => {
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    });
  }, [backendSources]);

  const [findingCategory, setFindingCategory] = useState<
    "all" | "citation" | "fact"
  >("all");

  const [rejectingFindingId, setRejectingFindingId] = useState<string | null>(
    null,
  );
  const [rejectReason, setRejectReason] = useState("");

  const drafts = useMemo<DraftItem[]>(() => {
    return (backendDocs ?? []).map((document) => ({
      id: document.id,
      title: document.title,
      summary: "Saved matter draft with immutable version history.",
      templateType: "Matter draft",
      citationsCount: 0,
      lastEdited: "Saved in workspace",
      version: `v${document.version_no}`,
      status: "Working Draft" as const,
    }));
  }, [backendDocs]);

  const [findings, setFindings] = useState<FindingItem[]>([
    {
      id: "find-1",
      dimension: "Quotation",
      agent: "Citation Reviewer",
      status: "Supported",
      title: "Innoventive Industries Ltd. v. ICICI Bank",
      citationOrSource: "(2018) 1 SCC 407",
      proposition:
        "Adjudicating authority must ascertain default from records and cannot evaluate viability at Section 7 admission.",
      bench: "2-Judge Bench · Supreme Court",
      detail:
        "100% exact character-level verbatim quotation parity confirmed against primary judgment.",
    },
    {
      id: "find-2",
      dimension: "Subsequent Treatment",
      agent: "Citation Reviewer",
      status: "Supported",
      title: "Swiss Ribbons Pvt. Ltd. v. Union of India",
      citationOrSource: "(2019) 4 SCC 17",
      proposition:
        "Preamble of the Insolvency and Bankruptcy Code prioritizes resolution over liquidation.",
      bench: "2-Judge Bench · Supreme Court",
      detail:
        "Good law; affirmed in subsequent Constitution Bench decisions with no adverse negative treatment.",
    },
    {
      id: "find-3",
      dimension: "Proposition Support",
      agent: "Citation Reviewer",
      status: "Supported",
      title: "Dena Bank v. C. Shivakumar Reddy",
      citationOrSource: "(2021) 10 SCC 330",
      proposition:
        "Balance sheet entry constitutes written acknowledgment of debt under Section 18 of the Limitation Act, 1963.",
      bench: "3-Judge Bench · Supreme Court",
      detail:
        "98% semantic entailment match; directly supports the limitation extension claim in Paragraph 14 of draft brief.",
    },
    {
      id: "find-4",
      dimension: "Identity",
      agent: "Citation Reviewer",
      status: "Supported",
      title: "Pooja Ramesh Singh v. J&K Bank Ltd.",
      citationOrSource: "2026 INSC 668",
      proposition:
        "Distinguishes actual cited paragraph from unestablished secondary citations.",
      bench: "Division Bench · Supreme Court",
      detail:
        "Reporter fixture resolved directly via eCourtsIndia and InIRAC adapter.",
    },
    {
      id: "find-5",
      dimension: "Fact Consistency",
      agent: "Fact Reviewer",
      status: "Contradicted",
      title: "Principal Debt Amount Mismatch",
      citationOrSource:
        "Audited_Bank_Ledger_Statements.xlsx vs Statutory_Demand_Notice_Section8.pdf",
      proposition:
        "Demand Notice claims ₹18,45,00,000 principal, whereas Audited Bank Ledger records ₹18,50,00,000.",
      detail:
        "Material contradiction of ₹5,00,000 detected. Blocking Reviewed Export Gate until resolved or reconciled.",
    },
    {
      id: "find-6",
      dimension: "Fact Consistency",
      agent: "Fact Reviewer",
      status: "Supported",
      title: "Deemed Default Date Verification",
      citationOrSource: "NeSL_Default_Authentication_Record.pdf",
      proposition:
        "Default date 18 Jul 2025 in Petition ¶12 is confirmed by NeSL Information Utility Certificate #IU-2026-9041.",
      detail:
        "Certified record of default matches repayment milestone schedule in Syndicated Facility Agreement.",
    },
  ]);

  const tabs = useMemo(
    () => [
      { id: "documents", label: `Documents (${documents.length})` },
      { id: "drafts", label: `Drafts (${drafts.length})` },
      { id: "forensics", label: "Review Findings" },
    ],
    [documents.length, drafts.length],
  );

  useEffect(() => {
    const activeBtn = tabRefs.current[activeTab];
    const container = navContainerRef.current;
    const indicator = indicatorRef.current;
    if (!activeBtn || !container || !indicator) return;

    const btnRect = activeBtn.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const targetX = btnRect.left - containerRect.left;
    const targetWidth = btnRect.width;

    gsap.to(indicator, {
      x: targetX,
      width: targetWidth,
      opacity: 1,
      duration: 0.32,
      ease: "power2.out",
      overwrite: "auto",
    });
  }, [activeTab]);

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      if (docSearchQuery.trim()) {
        const query = docSearchQuery.toLowerCase();
        if (!doc.name.toLowerCase().includes(query)) return false;
      }
      if (docCategoryFilter !== "all" && doc.type !== docCategoryFilter) {
        return false;
      }
      return true;
    });
  }, [documents, docSearchQuery, docCategoryFilter]);

  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      if (findingCategory === "citation") {
        return f.agent === "Citation Reviewer";
      }
      if (findingCategory === "fact") {
        return f.agent === "Fact Reviewer";
      }
      return true;
    });
  }, [findings, findingCategory]);

  async function handleUploadDocument(data: {
    name: string;
    type: EvidenceType;
    matterId?: string;
    file?: File | null;
  }) {
    if (!data.file) {
      throw new Error("Choose a source file before uploading");
    }
    await uploadSourceMutation.mutateAsync({
      matterId: matter.id,
      file: data.file,
    });
  }

  async function handleDownloadSource(sourceId: string, filename: string) {
    const blob = await downloadSourceMutation.mutateAsync(sourceId);
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = filename;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleCreateDraftSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newDraftTitle.trim()) return;
    await createDocumentMutation.mutateAsync({ title: newDraftTitle.trim() });
    setNewDraftTitle("");
    setNewDraftPrompt("");
    setDraftModalOpen(false);
  }

  function handleAcceptFinding(id: string) {
    setFindings((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, humanDecision: { action: "accepted" } } : f,
      ),
    );
  }

  function handleRejectFinding(id: string, reason: string) {
    setFindings((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, humanDecision: { action: "rejected", reason } }
          : f,
      ),
    );
    setRejectingFindingId(null);
    setRejectReason("");
  }

  const promptSuggestions = [
    "Draft Section 7 Application from Facility Agreement milestones",
    "Draft Limitation Rejoinder under Article 137 citing Dena Bank",
    "Draft Chronology of Default Milestones with NeSL dates",
    "Draft Section 9 Interim Injunction Application against assets",
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <div className="flex flex-col gap-3 border-b border-stone-200/90 px-6 pt-4 pb-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to matters"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600 hover:bg-[#edf4fa] hover:text-[#487aa8] transition-colors shadow-2xs cursor-pointer"
              title="Back to matters list"
            >
              <ArrowLeftIcon size={15} />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="m-0 truncate font-sans text-lg font-semibold text-stone-950 sm:text-xl">
                  {matter.name}
                </h1>
                <span className="hidden sm:inline-block rounded-sm bg-[#edf4fa] px-2 py-0.5 text-[10.5px] font-medium text-[#2c5478] border border-[#cbe0f2]">
                  {matter.matterType}
                </span>
                <span
                  className={`rounded-sm px-2 py-0.5 text-[10px] font-semibold ${
                    matter.health === "Healthy"
                      ? "bg-[#edf8f1] text-[#1e6f3d] border border-emerald-200"
                      : matter.health === "Needs attention"
                        ? "bg-[#fef7ee] text-[#b26b18] border border-amber-200"
                        : "bg-[#fef2f1] text-[#b9382b] border border-rose-200"
                  }`}
                >
                  {matter.health}
                </span>
              </div>
              <p className="m-0 pt-0.5 text-xs text-stone-500 font-mono">
                {matter.caseNumber} · {matter.court} · Stage: {matter.stage}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setUploadModalOpen(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 shadow-2xs hover:bg-[#edf4fa] hover:text-[#487aa8] transition-colors cursor-pointer"
            >
              <UploadIcon size={13} className="text-[#487aa8]" />
              <span>Upload document</span>
            </button>

            <button
              type="button"
              onClick={() => setDraftModalOpen(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#487aa8] px-3.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#3d6991] transition-colors cursor-pointer"
            >
              <PlusIcon size={14} />
              <span>New draft</span>
            </button>
          </div>
        </div>

        <div
          ref={navContainerRef}
          role="tablist"
          aria-label="Matter sections"
          className="relative flex items-center gap-6 overflow-x-auto border-t border-stone-100 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[tab.id] = el;
                }}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() =>
                  setActiveTab(tab.id as "documents" | "drafts" | "forensics")
                }
                className={`pb-2.5 pt-1 text-[13.5px] sm:text-sm font-medium transition-colors cursor-pointer shrink-0 ${
                  isActive
                    ? "text-[#2c5478] font-semibold"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                {tab.label}
              </button>
            );
          })}

          <div
            ref={indicatorRef}
            className="absolute bottom-0 h-[2.5px] bg-[#487aa8] rounded-full pointer-events-none -mb-px"
            style={{ left: 0, width: 0, opacity: 0 }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:p-6">
        {activeTab === "documents" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                {(
                  [
                    "all",
                    "Pleadings",
                    "Evidence",
                    "Contracts",
                    "Orders",
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setDocCategoryFilter(cat)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer capitalize ${
                      docCategoryFilter === cat
                        ? "bg-[#487aa8] text-white font-semibold shadow-2xs"
                        : "text-stone-600 hover:bg-[#edf4fa] hover:text-[#487aa8]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="relative flex items-center">
                <SearchIcon
                  size={14}
                  className="absolute left-2.5 text-stone-400 pointer-events-none"
                />
                <input
                  type="text"
                  name="document-search"
                  aria-label="Search matter documents"
                  autoComplete="off"
                  spellCheck={false}
                  value={docSearchQuery}
                  onChange={(e) => setDocSearchQuery(e.target.value)}
                  placeholder="Search matter documents…"
                  className="h-8 w-48 rounded-md border border-stone-200 bg-white pr-2.5 pl-8 text-xs text-stone-800 shadow-2xs placeholder:text-stone-400 focus-visible:border-[#487aa8] focus-visible:ring-2 focus-visible:ring-[#487aa8]/15 focus-visible:outline-none sm:w-60"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDocs.length === 0 ? (
                <div className="col-span-full flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[#b9d1e5] bg-[#f8fbfe] px-6 py-10 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#cbe0f2] bg-white text-[#487aa8] shadow-2xs">
                    <FolderKanbanIcon size={22} />
                  </span>
                  <h4 className="m-0 pt-4 text-sm font-semibold text-stone-900">
                    {documents.length === 0
                      ? "No source records yet"
                      : "No records match these filters"}
                  </h4>
                  <p className="m-0 max-w-sm pt-1.5 text-xs leading-5 text-stone-500">
                    {documents.length === 0
                      ? "Upload the agreements, notices, orders, or evidence Veritas should use for this matter."
                      : "Change the search or document type to see more records."}
                  </p>
                  {documents.length === 0 && (
                    <button
                      type="button"
                      onClick={() => setUploadModalOpen(true)}
                      className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-[#487aa8] px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#3b668e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#487aa8] focus-visible:ring-offset-2"
                    >
                      <UploadIcon size={13} />
                      Upload source
                    </button>
                  )}
                </div>
              ) : filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex flex-col justify-between rounded-lg border border-stone-200 bg-white p-4 shadow-2xs hover:border-[#487aa8]/40 hover:shadow-xs transition-all"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="rounded-sm bg-[#edf4fa] px-2 py-0.5 text-[10.5px] font-medium text-[#2c5478] border border-[#cbe0f2]">
                        {doc.type}
                      </span>
                      {doc.hasDiscrepancy ? (
                        <span className="inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertCircleIcon size={10} />
                          <span>Contradiction Flagged</span>
                        </span>
                      ) : (
                        <span className="rounded-sm bg-stone-100 px-2 py-0.5 text-[10px] font-mono text-stone-600 border border-stone-200">
                          {doc.format}
                        </span>
                      )}
                    </div>

                    <div className="flex items-start gap-2.5 pt-1">
                      <ColoredFileIcon
                        filename={doc.name}
                        format={doc.format}
                        category={doc.type}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="m-0 text-xs font-semibold text-stone-900 truncate">
                          {doc.name}
                        </h4>
                        <p className="m-0 text-[11px] text-stone-500 font-mono pt-0.5">
                          {doc.pages} pp · {doc.size}
                        </p>
                      </div>
                    </div>
                    <p className="m-0 pt-1 text-[11px] text-stone-500">
                      {doc.uploadedAt}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onSendToAgent?.({ title: doc.name, type: "document" })
                      }
                      className="inline-flex items-center gap-1.5 rounded-md bg-[#edf4fa] px-2.5 py-1 text-[11px] font-semibold text-[#2c5478] hover:bg-[#dceaf5] border border-[#cbe0f2] transition-colors cursor-pointer"
                      title="Send document to Veritas Agent for analysis"
                    >
                      <BotIcon size={12} className="text-[#487aa8]" />
                      <span>Send to Agent</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveDocumentId(doc.id);
                          alert(
                            `Inspecting candidate evidence spans for ${doc.name}...`,
                          );
                        }}
                        className="inline-flex h-6 items-center gap-1 rounded-sm border border-stone-200 px-2 text-[10.5px] font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 cursor-pointer"
                      >
                        <EyeIcon size={11} />
                        <span>Spans</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDownloadSource(doc.id, doc.name)}
                        disabled={downloadSourceMutation.isPending}
                        className="flex h-6 w-6 items-center justify-center rounded-sm border border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-stone-900 cursor-pointer"
                        title="Download document"
                      >
                        <DownloadIcon size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "drafts" && (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="m-0 text-sm font-semibold text-stone-900">
                Working Briefs & Petitions
              </h3>
              <p className="m-0 text-xs text-stone-500 pt-0.5">
                Drafts generated by Veritas Writer Agent with propositions
                attached to primary evidence spans.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {drafts.length === 0 ? (
                <div className="col-span-full flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[#b9d1e5] bg-[#f8fbfe] px-6 py-10 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#cbe0f2] bg-white text-[#487aa8] shadow-2xs">
                    <FileTextIcon size={22} />
                  </span>
                  <h4 className="m-0 pt-4 text-sm font-semibold text-stone-900">
                    No drafts yet
                  </h4>
                  <p className="m-0 max-w-sm pt-1.5 text-xs leading-5 text-stone-500">
                    Create the first working draft for this matter. Veritas will
                    keep every later version in its history.
                  </p>
                  <button
                    type="button"
                    onClick={() => setDraftModalOpen(true)}
                    className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-[#487aa8] px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#3b668e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#487aa8] focus-visible:ring-offset-2"
                  >
                    <PlusIcon size={13} />
                    Create draft
                  </button>
                </div>
              ) : drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="flex flex-col justify-between rounded-lg border border-stone-200 bg-white p-4 shadow-2xs hover:border-[#487aa8]/40 hover:shadow-xs transition-all"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-sm bg-[#edf4fa] px-2 py-0.5 text-[10.5px] font-medium text-[#2c5478] border border-[#cbe0f2]">
                          {draft.templateType}
                        </span>
                        <span className="rounded-xs bg-stone-100 px-1.5 py-0.5 font-mono text-[10px] text-stone-500">
                          {draft.version}
                        </span>
                      </div>
                      <span
                        className={`rounded-sm px-2 py-0.5 text-[10px] font-semibold ${
                          draft.status === "Eligible for Export"
                            ? "bg-[#edf8f1] text-[#1e6f3d] border border-emerald-200"
                            : draft.status === "Review Needed"
                              ? "bg-[#fef7ee] text-[#b26b18] border border-amber-200"
                              : "bg-[#edf4fa] text-[#2c5478] border border-[#cbe0f2]"
                        }`}
                      >
                        {draft.status}
                      </span>
                    </div>

                    <div className="flex items-start gap-2.5 pt-1">
                      <ColoredFileIcon
                        filename={draft.title}
                        category="Draft"
                        format="DOCX"
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="m-0 text-xs font-semibold text-stone-900 line-clamp-2">
                          {draft.title}
                        </h4>
                      </div>
                    </div>

                    <p className="m-0 text-[11.5px] text-stone-500 line-clamp-2 leading-relaxed">
                      {draft.summary}
                    </p>

                    <div className="flex items-center gap-3 pt-1 text-[11px] text-stone-500 font-mono">
                      <span>{draft.citationsCount} citations checked</span>
                      <span>·</span>
                      <span>{draft.lastEdited}</span>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onSendToAgent?.({ title: draft.title, type: "draft" })
                      }
                      className="inline-flex items-center gap-1.5 rounded-md bg-[#edf4fa] px-2.5 py-1 text-[11px] font-semibold text-[#2c5478] hover:bg-[#dceaf5] border border-[#cbe0f2] transition-colors cursor-pointer"
                      title="Send draft to Veritas Agent for citation review"
                    >
                      <BotIcon size={12} className="text-[#487aa8]" />
                      <span>Send to Agent</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        alert(
                          `Opening ${draft.title} in Veritas structured editor...`,
                        )
                      }
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#487aa8] hover:text-[#386289] cursor-pointer"
                    >
                      <span>Editor</span>
                      <ExternalLinkIcon size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === "forensics" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="m-0 text-sm font-semibold text-stone-900">
                  Review Findings
                </h3>
                <p className="m-0 text-xs text-stone-500 pt-0.5">
                  Citation and fact findings for the current working draft.
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                {(["all", "citation", "fact"] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFindingCategory(cat)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer capitalize ${
                      findingCategory === cat
                        ? "bg-[#487aa8] text-white font-semibold shadow-2xs"
                        : "text-stone-600 hover:bg-[#edf4fa] hover:text-[#487aa8]"
                    }`}
                  >
                    {cat === "all"
                      ? `All (${findings.length})`
                      : cat === "citation"
                        ? "Citation Checks (4)"
                        : "Fact Consistency (2)"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filteredFindings.map((finding) => (
                <div
                  key={finding.id}
                  className="flex flex-col justify-between rounded-lg border border-stone-200 bg-white p-4 shadow-2xs hover:border-[#487aa8]/40 hover:shadow-xs transition-all"
                >
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-sm bg-[#edf4fa] px-2 py-0.5 text-[10px] font-medium text-[#2c5478] border border-[#cbe0f2]">
                          {finding.dimension}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-stone-500">
                          <BotIcon size={11} className="text-[#487aa8]" />
                          <span>{finding.agent}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] font-semibold ${
                            finding.status === "Supported"
                              ? "bg-[#edf8f1] text-[#1e6f3d] border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {finding.status === "Supported" ? (
                            <CheckIcon size={10} />
                          ) : (
                            <AlertCircleIcon size={10} />
                          )}
                          <span>{finding.status}</span>
                        </span>
                        {finding.humanDecision?.action === "accepted" && (
                          <span className="inline-flex items-center gap-1 rounded-sm bg-[#edf8f1] px-2 py-0.5 text-[10px] font-semibold text-[#1e6f3d] border border-emerald-200">
                            <CheckIcon size={10} />
                            <span>Accepted</span>
                          </span>
                        )}
                        {finding.humanDecision?.action === "rejected" && (
                          <span className="inline-flex items-center gap-1 rounded-sm bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200">
                            <XIcon size={10} />
                            <span>Rejected</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="m-0 text-xs font-semibold text-stone-900">
                        {finding.title}
                      </h4>
                      <p className="m-0 text-[11px] text-stone-500 font-mono pt-0.5">
                        {finding.citationOrSource}{" "}
                        {finding.bench ? `· ${finding.bench}` : ""}
                      </p>
                    </div>

                    <div className="rounded-sm border-l-2 border-[#487aa8] bg-[#f8fbfe] pl-3 pr-2 py-2 text-[11.5px] text-stone-700 leading-relaxed">
                      <p className="m-0 italic">
                        &ldquo;{finding.proposition}&rdquo;
                      </p>
                    </div>

                    <p className="m-0 text-[11px] text-stone-600 leading-normal">
                      {finding.detail}
                    </p>

                    {finding.humanDecision?.action === "rejected" &&
                      finding.humanDecision.reason && (
                        <div className="rounded-sm border border-rose-100 bg-rose-50/60 px-3 py-2">
                          <p className="m-0 text-[10.5px] font-semibold text-rose-700">
                            Rejection reason
                          </p>
                          <p className="m-0 pt-0.5 text-[11px] text-rose-800 leading-relaxed">
                            {finding.humanDecision.reason}
                          </p>
                        </div>
                      )}
                  </div>

                  <div className="pt-3 mt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onSendToAgent?.({ title: finding.title, type: "draft" })
                      }
                      className="inline-flex items-center gap-1.5 rounded-md bg-[#edf4fa] px-2.5 py-1 text-[11px] font-semibold text-[#2c5478] hover:bg-[#dceaf5] border border-[#cbe0f2] transition-colors cursor-pointer"
                      title="Send finding to Veritas Agent for resolution"
                    >
                      <BotIcon size={12} className="text-[#487aa8]" />
                      <span>Send to Agent</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {finding.status === "Contradicted" &&
                        !finding.humanDecision && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleAcceptFinding(finding.id)}
                              className="inline-flex h-6 items-center gap-1 rounded-sm border border-emerald-200 bg-[#edf8f1] px-2 text-[10.5px] font-semibold text-[#1e6f3d] hover:bg-emerald-100 transition-colors cursor-pointer"
                              aria-label={`Accept finding: ${finding.title}`}
                            >
                              <CheckIcon size={10} />
                              <span>Accept</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingFindingId(finding.id);
                                setRejectReason("");
                              }}
                              className="inline-flex h-6 items-center gap-1 rounded-sm border border-rose-200 bg-rose-50 px-2 text-[10.5px] font-semibold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                              aria-label={`Reject finding: ${finding.title}`}
                            >
                              <XIcon size={10} />
                              <span>Reject</span>
                            </button>
                          </>
                        )}
                      <button
                        type="button"
                        onClick={() =>
                          alert(
                            `Inspecting verified evidence span for ${finding.title}...`,
                          )
                        }
                        className="inline-flex h-6 items-center gap-1 rounded-sm border border-stone-200 px-2 text-[10.5px] font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 cursor-pointer"
                      >
                        <EyeIcon size={11} />
                        <span>Inspect Span</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <UploadDocumentModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUpload={handleUploadDocument}
        matters={[matter]}
        preselectedMatterId={matter.id}
      />

      {draftModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-stone-950/40 p-4 backdrop-blur-xs"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setDraftModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-draft-title"
            aria-describedby="create-draft-description"
            className="relative my-auto w-full max-w-xl overflow-visible rounded-xl border border-stone-200/90 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 sm:max-w-2xl sm:p-8"
          >
            <div className="flex items-start justify-between pb-4 border-b border-stone-100">
              <div>
                <h2
                  id="create-draft-title"
                  className="m-0 font-sans text-base font-semibold text-stone-900 sm:text-lg"
                >
                  Create Draft
                </h2>
                <p
                  id="create-draft-description"
                  className="m-0 pt-1 text-xs leading-relaxed text-stone-500"
                >
                  Describe the document you need and the source records the
                  agent should use.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDraftModalOpen(false)}
                aria-label="Close create draft dialog"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors cursor-pointer shrink-0 ml-4"
              >
                <XIcon size={15} />
              </button>
            </div>

            <form
              onSubmit={handleCreateDraftSubmit}
              className="pt-5 flex flex-col gap-4.5"
            >
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="draft-title"
                  className="text-xs font-semibold text-stone-700"
                >
                  Draft title
                </label>
                <input
                  type="text"
                  required
                  id="draft-title"
                  name="draft-title"
                  autoComplete="off"
                  value={newDraftTitle}
                  onChange={(e) => setNewDraftTitle(e.target.value)}
                  placeholder="Rejoinder on limitation under Article 137…"
                  className="h-10 w-full rounded-lg border border-stone-200/90 bg-white px-3.5 text-xs text-stone-900 shadow-2xs transition-[border-color,box-shadow] placeholder:text-stone-400 focus-visible:border-[#487aa8] focus-visible:ring-2 focus-visible:ring-[#487aa8]/15 focus-visible:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-stone-700">
                  Draft type
                </label>
                <CustomSelect
                  value={newDraftTemplate}
                  onChange={setNewDraftTemplate}
                  options={TEMPLATE_OPTIONS}
                  ariaLabel="Draft type"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="draft-instructions"
                    className="text-xs font-semibold text-stone-700"
                  >
                    Drafting instructions
                  </label>
                  <span className="rounded-xs bg-[#edf4fa] px-1.5 py-0.5 text-[10px] font-medium text-[#2c5478] border border-[#cbe0f2]">
                    Agent assisted
                  </span>
                </div>
                <textarea
                  rows={4}
                  id="draft-instructions"
                  name="draft-instructions"
                  value={newDraftPrompt}
                  onChange={(e) => setNewDraftPrompt(e.target.value)}
                  placeholder="Include the statutory grounds, disputed facts, and records to rely on…"
                  className="min-h-[110px] w-full resize-none rounded-lg border border-stone-200/90 bg-white p-3.5 text-xs leading-relaxed text-stone-900 shadow-2xs transition-[border-color,box-shadow] placeholder:text-stone-400 focus-visible:border-[#487aa8] focus-visible:ring-2 focus-visible:ring-[#487aa8]/15 focus-visible:outline-none"
                />

                <div className="mt-1 flex flex-wrap gap-1.5">
                  {promptSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setNewDraftPrompt(suggestion)}
                      className="rounded-md border border-stone-200/90 bg-[#f8fbfe] px-2.5 py-1 text-[11px] font-medium text-stone-600 hover:border-[#487aa8] hover:bg-[#edf4fa] hover:text-[#2c5478] transition-all cursor-pointer text-left shadow-2xs"
                    >
                      + {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setDraftModalOpen(false)}
                  className="h-9.5 rounded-lg border border-stone-200 bg-white px-4 text-xs font-medium text-stone-700 shadow-2xs hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex h-9.5 items-center gap-1.5 rounded-lg bg-[#487aa8] px-5 text-xs font-semibold text-white shadow-2xs hover:bg-[#3b668e] transition-all cursor-pointer"
                >
                  <BotIcon size={13} />
                  <span>Create Draft</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {rejectingFindingId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-stone-950/40 p-4 backdrop-blur-xs"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              setRejectingFindingId(null);
              setRejectReason("");
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-finding-title"
            aria-describedby="reject-finding-description"
            className="relative my-auto w-full max-w-md overflow-visible rounded-xl border border-stone-200/90 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-start justify-between pb-4 border-b border-stone-100">
              <div>
                <h2
                  id="reject-finding-title"
                  className="m-0 font-sans text-base font-semibold text-stone-900"
                >
                  Reject Finding
                </h2>
                <p
                  id="reject-finding-description"
                  className="m-0 pt-1 text-xs leading-relaxed text-stone-500"
                >
                  Provide a reason for rejecting this machine finding. This
                  decision is recorded locally.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRejectingFindingId(null);
                  setRejectReason("");
                }}
                aria-label="Close reject finding dialog"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors cursor-pointer shrink-0 ml-4"
              >
                <XIcon size={15} />
              </button>
            </div>

            <div className="pt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="reject-reason"
                  className="text-xs font-semibold text-stone-700"
                >
                  Rejection reason
                  <span className="ml-1 text-rose-600">*</span>
                </label>
                <textarea
                  id="reject-reason"
                  name="reject-reason"
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="State why the machine finding is being rejected — e.g. citation is inapplicable to the current proposition…"
                  className="min-h-[100px] w-full resize-none rounded-lg border border-stone-200/90 bg-white p-3.5 text-xs leading-relaxed text-stone-900 shadow-2xs transition-[border-color,box-shadow] placeholder:text-stone-400 focus-visible:border-[#487aa8] focus-visible:ring-2 focus-visible:ring-[#487aa8]/15 focus-visible:outline-none"
                />
                {rejectReason.trim() === "" && (
                  <p className="m-0 text-[11px] text-rose-600">
                    A rejection reason is required.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    setRejectingFindingId(null);
                    setRejectReason("");
                  }}
                  className="h-9 rounded-lg border border-stone-200 bg-white px-4 text-xs font-medium text-stone-700 shadow-2xs hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={rejectReason.trim() === ""}
                  onClick={() =>
                    handleRejectFinding(rejectingFindingId, rejectReason.trim())
                  }
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-rose-600 px-5 text-xs font-semibold text-white shadow-2xs hover:bg-rose-700 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <XIcon size={12} />
                  <span>Confirm Rejection</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
