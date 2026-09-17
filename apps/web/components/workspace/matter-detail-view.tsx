"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { gsap } from "gsap";
import type { Matter } from "../../types/workspace/types";
import { CustomSelect, type SelectOption } from "./custom-select";
import { UploadDocumentModal, type EvidenceType } from "./upload-document-modal";
import {
  ArrowLeftIcon,
  CheckIcon,
  DownloadIcon,
  ExternalLinkIcon,
  EyeIcon,
  FileTextIcon,
  PlusIcon,
  SearchIcon,
  BotIcon,
  UploadIcon,
  XIcon,
  AlertCircleIcon,
  ShieldCheckIcon,
} from "./workspace-icons";

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
  spansCount: number;
  format: "PDF" | "XLSX" | "DOCX";
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

interface FindingItem {
  id: string;
  dimension: "Quotation" | "Identity" | "Proposition Support" | "Subsequent Treatment" | "Fact Consistency";
  agent: "Citation Reviewer" | "Fact Reviewer";
  status: "Supported" | "Contradicted";
  title: string;
  citationOrSource: string;
  proposition: string;
  bench?: string;
  detail: string;
}

const TEMPLATE_OPTIONS: SelectOption[] = [
  {
    value: "IBC Section 7 Application (Form 1)",
    label: "IBC Section 7 Application (Form 1)",
    description: "Financial Creditor petition initiating CIRP against Corporate Debtor",
    badge: "Insolvency",
  },
  {
    value: "Rejoinder on Limitation under Article 137",
    label: "Rejoinder on Limitation under Article 137",
    description: "Countering 3-year bar via balance sheet acknowledgment (Sec 18)",
    badge: "Pleadings",
  },
  {
    value: "Synopsis and Chronological List of Dates",
    label: "Synopsis and Chronological List of Dates",
    description: "Sequenced transaction milestones cross-referenced to evidentiary spans",
    badge: "Timeline",
  },
  {
    value: "Section 9 Interim Relief Petition",
    label: "Section 9 Interim Relief Petition",
    description: "Arbitration petition for asset freezing and injunction protection",
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
    description: "Precedent audit report with negative judicial history checking",
    badge: "Memo",
  },
];

export function MatterDetailView({
  matter,
  onBack,
  onSendToAgent,
}: MatterDetailViewProps) {
  const [activeTab, setActiveTab] = useState<"documents" | "drafts" | "overview" | "forensics">("documents");
  const [docSearchQuery, setDocSearchQuery] = useState("");
  const [docCategoryFilter, setDocCategoryFilter] = useState<string>("all");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [draftModalOpen, setDraftModalOpen] = useState(false);

  const [newDraftTitle, setNewDraftTitle] = useState("");
  const [newDraftTemplate, setNewDraftTemplate] = useState("IBC Section 7 Application (Form 1)");
  const [newDraftPrompt, setNewDraftPrompt] = useState("");

  const navContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const indicatorRef = useRef<HTMLDivElement>(null);

  const [documents, setDocuments] = useState<DocumentItem[]>([
    {
      id: "doc-1",
      name: "IBC_Section7_Form1_Petition.pdf",
      type: "Pleadings",
      pages: 56,
      size: "3.2 MB",
      uploadedAt: "Today, 10:14 AM",
      spansCount: 28,
      format: "PDF",
    },
    {
      id: "doc-2",
      name: "Syndicated_Facility_Agreement_2023.pdf",
      type: "Contracts",
      pages: 34,
      size: "2.1 MB",
      uploadedAt: "Yesterday",
      spansCount: 42,
      format: "PDF",
    },
    {
      id: "doc-3",
      name: "NeSL_Default_Authentication_Record.pdf",
      type: "Evidence",
      pages: 4,
      size: "520 KB",
      uploadedAt: "14 May 2026",
      spansCount: 6,
      format: "PDF",
    },
    {
      id: "doc-4",
      name: "Audited_Bank_Ledger_Statements.xlsx",
      type: "Evidence",
      pages: 12,
      size: "840 KB",
      uploadedAt: "10 May 2026",
      spansCount: 19,
      format: "XLSX",
      hasDiscrepancy: true,
    },
    {
      id: "doc-5",
      name: "Statutory_Demand_Notice_Section8.pdf",
      type: "Pleadings",
      pages: 8,
      size: "460 KB",
      uploadedAt: "06 May 2026",
      spansCount: 11,
      format: "PDF",
    },
    {
      id: "doc-6",
      name: "NCLT_Interim_Restraint_Order.pdf",
      type: "Orders",
      pages: 6,
      size: "380 KB",
      uploadedAt: "01 May 2026",
      spansCount: 8,
      format: "PDF",
    },
  ]);

  const [forensicCategory, setForensicCategory] = useState<"all" | "citation" | "fact">("all");

  const [drafts, setDrafts] = useState<DraftItem[]>([
    {
      id: "draft-1",
      title: "IBC Section 7 Application (Form 1 Petition)",
      summary: "Primary insolvency petition under Section 7 of IBC, 2016 for initiation of CIRP against Corporate Debtor default.",
      templateType: "Form 1 Petition",
      citationsCount: 18,
      lastEdited: "10 mins ago by Tanveer",
      version: "v3",
      status: "Working Draft",
    },
    {
      id: "draft-2",
      title: "Rejoinder on Limitation under Article 137",
      summary: "Pleading countering debtor's 3-year limitation objection via balance sheet debt acknowledgment under Section 18 Limitation Act.",
      templateType: "Limitation Brief",
      citationsCount: 9,
      lastEdited: "Yesterday by Tanveer",
      version: "v1",
      status: "Review Needed",
    },
    {
      id: "draft-3",
      title: "Synopsis and Chronological List of Dates",
      summary: "Chronological chain of transaction milestones from facility sanction to NeSL default record.",
      templateType: "Chronology Brief",
      citationsCount: 14,
      lastEdited: "3 days ago",
      version: "v2",
      status: "Eligible for Export",
    },
    {
      id: "draft-4",
      title: "Citation Verification & Currency Memo",
      summary: "Precedent audit report validating ratio decidendi and verifying negative judicial history across cited SC benches.",
      templateType: "Precedent Memo",
      citationsCount: 12,
      lastEdited: "5 days ago",
      version: "v4",
      status: "Eligible for Export",
    },
  ]);

  const [findings] = useState<FindingItem[]>([
    {
      id: "find-1",
      dimension: "Quotation",
      agent: "Citation Reviewer",
      status: "Supported",
      title: "Innoventive Industries Ltd. v. ICICI Bank",
      citationOrSource: "(2018) 1 SCC 407",
      proposition: "Adjudicating authority must ascertain default from records and cannot evaluate viability at Section 7 admission.",
      bench: "2-Judge Bench · Supreme Court",
      detail: "100% exact character-level verbatim quotation parity confirmed against primary judgment.",
    },
    {
      id: "find-2",
      dimension: "Subsequent Treatment",
      agent: "Citation Reviewer",
      status: "Supported",
      title: "Swiss Ribbons Pvt. Ltd. v. Union of India",
      citationOrSource: "(2019) 4 SCC 17",
      proposition: "Preamble of the Insolvency and Bankruptcy Code prioritizes resolution over liquidation.",
      bench: "2-Judge Bench · Supreme Court",
      detail: "Good law; affirmed in subsequent Constitution Bench decisions with no adverse negative treatment.",
    },
    {
      id: "find-3",
      dimension: "Proposition Support",
      agent: "Citation Reviewer",
      status: "Supported",
      title: "Dena Bank v. C. Shivakumar Reddy",
      citationOrSource: "(2021) 10 SCC 330",
      proposition: "Balance sheet entry constitutes written acknowledgment of debt under Section 18 of the Limitation Act, 1963.",
      bench: "3-Judge Bench · Supreme Court",
      detail: "98% semantic entailment match; directly supports the limitation extension claim in Paragraph 14 of draft brief.",
    },
    {
      id: "find-4",
      dimension: "Identity",
      agent: "Citation Reviewer",
      status: "Supported",
      title: "Pooja Ramesh Singh v. J&K Bank Ltd.",
      citationOrSource: "2026 INSC 668",
      proposition: "Distinguishes actual cited paragraph from unestablished secondary citations.",
      bench: "Division Bench · Supreme Court",
      detail: "Reporter fixture resolved directly via eCourtsIndia and InIRAC adapter.",
    },
    {
      id: "find-5",
      dimension: "Fact Consistency",
      agent: "Fact Reviewer",
      status: "Contradicted",
      title: "Principal Debt Amount Mismatch",
      citationOrSource: "Audited_Bank_Ledger_Statements.xlsx vs Statutory_Demand_Notice_Section8.pdf",
      proposition: "Demand Notice claims ₹18,45,00,000 principal, whereas Audited Bank Ledger records ₹18,50,00,000.",
      detail: "Material contradiction of ₹5,00,000 detected. Blocking Reviewed Export Gate until resolved or reconciled.",
    },
    {
      id: "find-6",
      dimension: "Fact Consistency",
      agent: "Fact Reviewer",
      status: "Supported",
      title: "Deemed Default Date Verification",
      citationOrSource: "NeSL_Default_Authentication_Record.pdf",
      proposition: "Default date 18 Jul 2025 in Petition ¶12 is confirmed by NeSL Information Utility Certificate #IU-2026-9041.",
      detail: "Certified record of default matches repayment milestone schedule in Syndicated Facility Agreement.",
    },
  ]);

  const tabs = useMemo(
    () => [
      { id: "documents", label: `Documents (${documents.length})` },
      { id: "drafts", label: `Drafts (${drafts.length})` },
      { id: "overview", label: "Overview" },
      { id: "forensics", label: "Forensics & Citations" },
    ],
    [documents.length, drafts.length]
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
      if (forensicCategory === "citation") {
        return f.agent === "Citation Reviewer";
      }
      if (forensicCategory === "fact") {
        return f.agent === "Fact Reviewer";
      }
      return true;
    });
  }, [findings, forensicCategory]);

  function handleUploadDocument(data: {
    name: string;
    type: EvidenceType;
    matterId?: string;
    file?: File | null;
  }) {
    const trimmed = data.name.trim();
    const hasExtension = trimmed.endsWith(".pdf") || trimmed.endsWith(".xlsx") || trimmed.endsWith(".docx");
    const finalName = hasExtension ? trimmed : `${trimmed}.pdf`;
    const derivedFormat: "PDF" | "XLSX" | "DOCX" = finalName.endsWith(".xlsx")
      ? "XLSX"
      : finalName.endsWith(".docx")
        ? "DOCX"
        : "PDF";

    const newDoc: DocumentItem = {
      id: `doc-${Date.now()}`,
      name: finalName,
      type: data.type,
      pages: Math.floor(Math.random() * 20) + 4,
      size: data.file ? `${(data.file.size / (1024 * 1024)).toFixed(1)} MB` : "1.8 MB",
      uploadedAt: "Just now",
      spansCount: Math.floor(Math.random() * 15) + 5,
      format: derivedFormat,
    };

    setDocuments((prev) => [newDoc, ...prev]);
  }

  function handleCreateDraftSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newDraftTitle.trim()) return;

    const newDraft: DraftItem = {
      id: `draft-${Date.now()}`,
      title: newDraftTitle.trim(),
      summary: newDraftPrompt.trim() || `Draft generated from ${newDraftTemplate} template.`,
      templateType: newDraftTemplate,
      citationsCount: 4,
      lastEdited: "Just now by Tanveer",
      version: "v1",
      status: "Working Draft",
    };

    setDrafts((prev) => [newDraft, ...prev]);
    setNewDraftTitle("");
    setNewDraftPrompt("");
    setDraftModalOpen(false);
  }

  const promptSuggestions = [
    "Draft Section 7 Application from Facility Agreement milestones",
    "Draft Limitation Rejoinder under Article 137 citing Dena Bank",
    "Draft Chronology of Default Milestones with NeSL dates",
    "Draft Section 9 Interim Injunction Application against assets",
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white select-none">
      <div className="flex flex-col gap-3 border-b border-stone-200/90 px-6 pt-4 pb-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600 hover:bg-[#edf4fa] hover:text-[#487aa8] transition-colors shadow-2xs cursor-pointer"
              title="Back to matters list"
            >
              <ArrowLeftIcon size={15} />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="m-0 font-sans text-lg sm:text-xl font-normal text-stone-900 truncate">
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
          className="relative flex items-center gap-6 pt-2 border-t border-stone-100 overflow-x-auto no-scrollbar"
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
                onClick={() =>
                  setActiveTab(tab.id as "documents" | "drafts" | "overview" | "forensics")
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

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "documents" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                {(["all", "Pleadings", "Evidence", "Contracts", "Orders"] as const).map((cat) => (
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
                <SearchIcon size={14} className="absolute left-2.5 text-stone-400 pointer-events-none" />
                <input
                  type="text"
                  value={docSearchQuery}
                  onChange={(e) => setDocSearchQuery(e.target.value)}
                  placeholder="Search matter documents..."
                  className="h-8 w-48 sm:w-60 rounded-md border border-stone-200 bg-white pl-8 pr-2.5 text-xs text-stone-800 placeholder-stone-400 shadow-2xs focus:border-[#487aa8] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDocs.map((doc) => (
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
                      <FileTextIcon size={15} className="text-[#487aa8] shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <h4 className="m-0 text-xs font-semibold text-stone-900 truncate">
                          {doc.name}
                        </h4>
                        <p className="m-0 text-[11px] text-stone-500 font-mono pt-0.5">
                          {doc.pages} pp · {doc.size}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 text-[11px] text-stone-500 font-mono">
                      <span className="text-[#2c5478] font-medium">{doc.spansCount} extracted spans</span>
                      <span>·</span>
                      <span>{doc.uploadedAt}</span>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onSendToAgent?.({ title: doc.name, type: "document" })}
                      className="inline-flex items-center gap-1.5 rounded-md bg-[#edf4fa] px-2.5 py-1 text-[11px] font-semibold text-[#2c5478] hover:bg-[#dceaf5] border border-[#cbe0f2] transition-colors cursor-pointer"
                      title="Send document to Veritas Agent for analysis"
                    >
                      <BotIcon size={12} className="text-[#487aa8]" />
                      <span>Send to Agent</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => alert(`Inspecting candidate evidence spans for ${doc.name}...`)}
                        className="inline-flex h-6 items-center gap-1 rounded-sm border border-stone-200 px-2 text-[10.5px] font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 cursor-pointer"
                      >
                        <EyeIcon size={11} />
                        <span>Spans</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => alert(`Downloading reference source copy of ${doc.name}...`)}
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
              <h3 className="m-0 text-sm font-semibold text-stone-900">Working Briefs & Petitions</h3>
              <p className="m-0 text-xs text-stone-500 pt-0.5">
                Drafts generated by Veritas Writer Agent with propositions attached to primary evidence spans.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {drafts.map((draft) => (
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

                    <h4 className="m-0 pt-0.5 text-xs font-semibold text-stone-900 line-clamp-2">
                      {draft.title}
                    </h4>

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
                      onClick={() => onSendToAgent?.({ title: draft.title, type: "draft" })}
                      className="inline-flex items-center gap-1.5 rounded-md bg-[#edf4fa] px-2.5 py-1 text-[11px] font-semibold text-[#2c5478] hover:bg-[#dceaf5] border border-[#cbe0f2] transition-colors cursor-pointer"
                      title="Send draft to Veritas Agent for citation review"
                    >
                      <BotIcon size={12} className="text-[#487aa8]" />
                      <span>Send to Agent</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => alert(`Opening ${draft.title} in Veritas structured editor...`)}
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

        {activeTab === "overview" && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-stone-200 bg-[#f8fbfe] p-3.5 shadow-2xs">
                <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500 block">
                  Total Claim
                </span>
                <span className="font-display text-lg sm:text-xl font-normal text-stone-900 block pt-1">
                  ₹18.50 Cr
                </span>
                <span className="text-[11px] text-stone-400 block pt-0.5">
                  Principal default amount
                </span>
              </div>

              <div className="rounded-lg border border-stone-200 bg-[#f8fbfe] p-3.5 shadow-2xs">
                <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500 block">
                  Default Date
                </span>
                <span className="font-display text-lg sm:text-xl font-normal text-stone-900 block pt-1">
                  18 Jul 2025
                </span>
                <span className="text-[11px] text-emerald-700 font-medium block pt-0.5">
                  Certified by NeSL
                </span>
              </div>

              <div className="rounded-lg border border-stone-200 bg-[#f8fbfe] p-3.5 shadow-2xs">
                <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500 block">
                  Presiding Forum
                </span>
                <span className="font-display text-lg sm:text-xl font-normal text-stone-900 block pt-1 truncate">
                  NCLT New Delhi
                </span>
                <span className="text-[11px] text-stone-400 block pt-0.5 font-mono">
                  Bench-III · Court 2
                </span>
              </div>

              <div className="rounded-lg border border-stone-200 bg-[#f8fbfe] p-3.5 shadow-2xs">
                <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500 block">
                  Export Gate
                </span>
                <span className="font-display text-lg sm:text-xl font-normal text-amber-700 block pt-1 font-semibold">
                  Gated · 1 Issue
                </span>
                <span className="text-[11px] text-amber-700 block pt-0.5">
                  Ledger variance blocking
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div className="lg:col-span-2 flex flex-col gap-4">
                <div className="rounded-lg border border-stone-200 bg-white p-4.5 shadow-2xs">
                  <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-stone-500 font-mono">
                    Parties & Procedural Docket
                  </h3>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                    <div className="rounded-md border border-stone-200/80 bg-[#f8fbfe] p-3">
                      <span className="text-stone-400 block text-[11px]">Financial Creditor / Claimant</span>
                      <span className="font-semibold text-stone-900 block pt-0.5">{matter.petitioner}</span>
                    </div>
                    <div className="rounded-md border border-stone-200/80 bg-[#f8fbfe] p-3">
                      <span className="text-stone-400 block text-[11px]">Corporate Debtor / Respondent</span>
                      <span className="font-semibold text-stone-900 block pt-0.5">{matter.respondent}</span>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
                    <div className="rounded-md border border-stone-200/80 bg-[#f8fbfe] p-3">
                      <span className="text-stone-400 block text-[11px]">Presiding Forum</span>
                      <span className="font-semibold text-stone-900 block pt-0.5 truncate">{matter.court}</span>
                    </div>
                    <div className="rounded-md border border-stone-200/80 bg-[#f8fbfe] p-3">
                      <span className="text-stone-400 block text-[11px]">Docket Number</span>
                      <span className="font-mono text-stone-900 font-semibold block pt-0.5 truncate">{matter.caseNumber}</span>
                    </div>
                    <div className="rounded-md border border-stone-200/80 bg-[#f8fbfe] p-3">
                      <span className="text-stone-400 block text-[11px]">Procedural Stage</span>
                      <span className="font-semibold text-stone-900 block pt-0.5 truncate">{matter.stage}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-stone-200 bg-white p-4.5 shadow-2xs">
                  <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-stone-500 font-mono">
                    Chronology of Key Events & Evidence
                  </h3>
                  <div className="mt-3 flex flex-col gap-3 text-xs">
                    <div className="flex items-start gap-3">
                      <span className="font-mono text-[11px] text-stone-400 w-24 shrink-0 pt-0.5">14 Mar 2023</span>
                      <div className="flex-1 pb-3 border-b border-stone-100">
                        <p className="m-0 font-medium text-stone-900">Execution of Syndicated Facility Agreement</p>
                        <p className="m-0 text-stone-500 text-[11.5px] pt-0.5">
                          Credit facility of ₹18.5 Crore sanctioned with quarterly repayment milestones. Evidence in Syndicated_Facility_Agreement_2023.pdf.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="font-mono text-[11px] text-stone-400 w-24 shrink-0 pt-0.5">18 Jul 2025</span>
                      <div className="flex-1 pb-3 border-b border-stone-100">
                        <p className="m-0 font-medium text-stone-900">Date of First Default Recorded</p>
                        <p className="m-0 text-stone-500 text-[11.5px] pt-0.5">
                          Corporate Debtor failed to service scheduled principal installment; recall notice served under Section 7.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="font-mono text-[11px] text-stone-400 w-24 shrink-0 pt-0.5">06 May 2026</span>
                      <div className="flex-1 pb-3 border-b border-stone-100">
                        <p className="m-0 font-medium text-stone-900">Statutory Demand Notice Served</p>
                        <p className="m-0 text-stone-500 text-[11.5px] pt-0.5">
                          Demand notice served claiming principal debt; notice states ₹18,45,00,000 versus ledger record of ₹18,50,00,000.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="font-mono text-[11px] text-stone-400 w-24 shrink-0 pt-0.5">14 May 2026</span>
                      <div className="flex-1">
                        <p className="m-0 font-medium text-stone-900">NeSL Information Utility Record of Default</p>
                        <p className="m-0 text-stone-500 text-[11.5px] pt-0.5">
                          Information Utility Certificate #IU-2026-9041 establishes deemed default under Section 7(3)(a) of IBC.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="rounded-lg border border-[#cbe0f2] bg-[#f8fbfe] p-4.5 shadow-2xs flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#2c5478] font-mono">
                      Server Export Gate
                    </span>
                    <span className="rounded-sm px-2 py-0.5 text-[10.5px] font-semibold bg-[#fef7ee] text-[#b26b18] border border-amber-200">
                      Gated · 1 Issue
                    </span>
                  </div>

                  <div className="rounded-md border border-amber-200/70 bg-amber-50/50 p-2.5 text-xs text-amber-900">
                    <div className="flex items-center gap-1.5 font-semibold text-amber-800">
                      <AlertCircleIcon size={13} />
                      <span>Reviewed Export Gated</span>
                    </div>
                    <p className="m-0 text-[11px] text-amber-700 pt-1 leading-relaxed">
                      Veritas server policy prevents export until the ₹5,00,000 variance between Audited Ledger (₹18.50 Cr) and Statutory Demand Notice (₹18.45 Cr) is reconciled.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="rounded-md border border-stone-200 bg-white p-3">
                      <span className="text-[11px] text-stone-500 block">Verified Citations</span>
                      <span className="font-display text-xl text-stone-900 font-normal block pt-1">
                        {matter.citationsCount || 14}
                      </span>
                    </div>
                    <div className="rounded-md border border-stone-200 bg-white p-3">
                      <span className="text-[11px] text-stone-500 block">Fact Contradictions</span>
                      <span className="font-display text-xl font-normal block pt-1 text-rose-600 font-semibold">
                        {matter.discrepanciesCount || 1}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-stone-200/60 flex flex-col gap-1.5 text-xs">
                    <span className="text-[10.5px] font-semibold text-stone-400 uppercase tracking-wider font-mono">
                      Specialist Agents Status
                    </span>
                    <div className="flex items-center justify-between text-[11.5px] text-stone-700">
                      <span className="flex items-center gap-1.5">
                        <BotIcon size={12} className="text-[#487aa8]" />
                        <span>Writer Agent</span>
                      </span>
                      <span className="text-emerald-700 font-semibold text-[11px]">v3 Brief Synced</span>
                    </div>
                    <div className="flex items-center justify-between text-[11.5px] text-stone-700">
                      <span className="flex items-center gap-1.5">
                        <BotIcon size={12} className="text-[#487aa8]" />
                        <span>Citation Reviewer</span>
                      </span>
                      <span className="text-emerald-700 font-semibold text-[11px]">100% Quote Parity</span>
                    </div>
                    <div className="flex items-center justify-between text-[11.5px] text-stone-700">
                      <span className="flex items-center gap-1.5">
                        <BotIcon size={12} className="text-[#487aa8]" />
                        <span>Fact Reviewer</span>
                      </span>
                      <span className="text-rose-600 font-semibold text-[11px]">1 Discrepancy</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-stone-200 bg-white p-4.5 shadow-2xs">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-500 font-mono pb-2">
                    <ShieldCheckIcon size={14} className="text-[#487aa8]" />
                    <span>Audit Guarantees</span>
                  </div>
                  <ul className="m-0 p-0 list-none text-xs text-stone-600 flex flex-col gap-2">
                    <li className="flex items-start gap-1.5">
                      <CheckIcon size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                      <span>Zero hallucinated case law: SCC and INSC citations resolved.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckIcon size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                      <span>Exact verbatim quotations checked character-by-character.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckIcon size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                      <span>Every factual proposition anchored to evidentiary spans.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "forensics" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="m-0 text-sm font-semibold text-stone-900">Forensic Checks & Citation Audit</h3>
                <p className="m-0 text-xs text-stone-500 pt-0.5">
                  Veritas Specialist findings across citation identity, verbatim quote parity, and factual record consistency.
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                {(["all", "citation", "fact"] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setForensicCategory(cat)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer capitalize ${
                      forensicCategory === cat
                        ? "bg-[#487aa8] text-white font-semibold shadow-2xs"
                        : "text-stone-600 hover:bg-[#edf4fa] hover:text-[#487aa8]"
                    }`}
                  >
                    {cat === "all" ? `All (${findings.length})` : cat === "citation" ? "Citation Checks (4)" : "Fact Consistency (2)"}
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
                      <span
                        className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] font-semibold ${
                          finding.status === "Supported"
                            ? "bg-[#edf8f1] text-[#1e6f3d] border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {finding.status === "Supported" ? <CheckIcon size={10} /> : <AlertCircleIcon size={10} />}
                        <span>{finding.status}</span>
                      </span>
                    </div>

                    <div>
                      <h4 className="m-0 text-xs font-semibold text-stone-900">
                        {finding.title}
                      </h4>
                      <p className="m-0 text-[11px] text-stone-500 font-mono pt-0.5">
                        {finding.citationOrSource} {finding.bench ? `· ${finding.bench}` : ""}
                      </p>
                    </div>

                    <div className="rounded-sm border-l-2 border-[#487aa8] bg-[#f8fbfe] pl-3 pr-2 py-2 text-[11.5px] text-stone-700 leading-relaxed">
                      <p className="m-0 italic">&ldquo;{finding.proposition}&rdquo;</p>
                    </div>

                    <p className="m-0 text-[11px] text-stone-600 leading-normal">
                      {finding.detail}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onSendToAgent?.({ title: finding.title, type: "draft" })}
                      className="inline-flex items-center gap-1.5 rounded-md bg-[#edf4fa] px-2.5 py-1 text-[11px] font-semibold text-[#2c5478] hover:bg-[#dceaf5] border border-[#cbe0f2] transition-colors cursor-pointer"
                      title="Send finding to Veritas Agent for resolution"
                    >
                      <BotIcon size={12} className="text-[#487aa8]" />
                      <span>Send to Agent</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => alert(`Inspecting verified evidence span for ${finding.title}...`)}
                      className="inline-flex h-6 items-center gap-1 rounded-sm border border-stone-200 px-2 text-[10.5px] font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 cursor-pointer"
                    >
                      <EyeIcon size={11} />
                      <span>Inspect Span</span>
                    </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 p-4 backdrop-blur-xs select-none overflow-y-auto">
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-xl sm:max-w-2xl rounded-xl border border-stone-200/90 bg-white p-7 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-visible my-auto"
          >
            <div className="flex items-start justify-between pb-4 border-b border-stone-100">
              <div>
                <h2 className="font-sans text-base sm:text-lg font-semibold text-stone-900 m-0">
                  Create Draft
                </h2>
                <p className="text-xs text-stone-500 m-0 pt-1 leading-relaxed">
                  Direct the Veritas Writer Agent with statutory grounds and target evidentiary spans.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDraftModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors cursor-pointer shrink-0 ml-4"
              >
                <XIcon size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateDraftSubmit} className="pt-5 flex flex-col gap-4.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-stone-700">
                  Draft Title
                </label>
                <input
                  type="text"
                  required
                  value={newDraftTitle}
                  onChange={(e) => setNewDraftTitle(e.target.value)}
                  placeholder="e.g. Rejoinder on Limitation under Article 137"
                  className="h-10 w-full rounded-lg border border-stone-200/90 bg-white px-3.5 text-xs text-stone-900 placeholder:text-stone-400 shadow-2xs outline-none transition-all focus:border-[#487aa8] focus:ring-3 focus:ring-[#487aa8]/10"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-stone-700">
                  Specialist Template
                </label>
                <CustomSelect
                  value={newDraftTemplate}
                  onChange={setNewDraftTemplate}
                  options={TEMPLATE_OPTIONS}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-700">
                    Prompt / Instructions for Writer Agent
                  </label>
                  <span className="rounded-xs bg-[#edf4fa] px-1.5 py-0.5 text-[10px] font-medium text-[#2c5478] border border-[#cbe0f2]">
                    Autonomous Drafting
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={newDraftPrompt}
                  onChange={(e) => setNewDraftPrompt(e.target.value)}
                  placeholder="Provide drafting instructions, specific statutory grounds, and target evidence references..."
                  className="w-full rounded-lg border border-stone-200/90 bg-white p-3.5 text-xs text-stone-900 placeholder:text-stone-400 shadow-2xs outline-none transition-all focus:border-[#487aa8] focus:ring-3 focus:ring-[#487aa8]/10 resize-none leading-relaxed min-h-[110px]"
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
                  <span>Create Draft with Writer Agent</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
