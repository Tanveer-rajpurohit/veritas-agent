"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "../../components/workspace/app-sidebar";
import { CreateMatterModal } from "../../components/workspace/create-matter-modal";
import {
  UploadDocumentModal,
  type EvidenceType,
} from "../../components/workspace/upload-document-modal";
import {
  ColoredFileIcon,
  DownloadIcon,
  EyeIcon,
  PanelLeftIcon,
  SearchIcon,
  CheckIcon,
  CopyIcon,
} from "../../components/workspace/workspace-icons";
import { useMatters, useCreateMatter } from "../../hooks/matters/useMatters";
import { useUploadSource } from "../../hooks/sources/useSources";
import { useThreads, useDeleteThread } from "../../hooks/conversations/useConversations";
import type { Matter } from "../../types/workspace/types";

interface TestDocument {
  id: string;
  title: string;
  category: "Official Gazette & Rules" | "Court Precedents" | "Evidence Dossiers";
  sourceName: string;
  fileSize: string;
  description: string;
  testingRole: string;
  href: string;
  format: "PDF" | "TXT";
  badgeColor: string;
}

const TEST_DOCUMENTS: TestDocument[] = [
  {
    id: "pooja-sc-2026",
    title: "Supreme Court Landmark: Pooja Ramesh Singh v. J&K Bank",
    category: "Court Precedents",
    sourceName: "Supreme Court of India (2026 INSC 668)",
    fileSize: "9.6 KB",
    description:
      "Landmark ruling quashing NCLT/NCLAT orders due to AI-hallucinated citations and fictitious legal precedents. Mandates human-in-the-loop citation provenance before CIRP admission.",
    testingRole: "Verifies Citation Reviewer detects hallucinated citations and flags unverified precedents.",
    href: "/test-docs/pooja-ramesh-singh-sc-2026.pdf",
    format: "PDF",
    badgeColor: "border-rose-200 bg-rose-50 text-rose-700",
  },
  {
    id: "ibc-2016-official",
    title: "The Insolvency and Bankruptcy Code, 2016 (Official Gazette)",
    category: "Official Gazette & Rules",
    sourceName: "Ministry of Law & Justice / India Code",
    fileSize: "925 KB",
    description:
      "Official publication of Act No. 31 of 2016. Contains statutory provisions for Section 7 CIRP initiation, Section 3(12) default definitions, and overriding effect under Section 238.",
    testingRole: "Statutory baseline for validating financial debt and legal threshold compliance.",
    href: "/test-docs/the-insolvency-and-bankruptcy-code-2016-official.pdf",
    format: "PDF",
    badgeColor: "border-[#cbe0f2] bg-[#edf4fa] text-[#2c5478]",
  },
  {
    id: "ibbi-rules-official",
    title: "IBBI (Application to Adjudicating Authority) Rules, 2016",
    category: "Official Gazette & Rules",
    sourceName: "Insolvency and Bankruptcy Board of India",
    fileSize: "205 KB",
    description:
      "Official statutory rules governing insolvency filings before the NCLT. Includes Form 1 (Financial Creditor), Form 2 (IRP Consent), and Form 5 (Operational Creditor).",
    testingRole: "Authoritative procedural template used by Writer Agent for legal pleading drafting.",
    href: "/test-docs/ibbi-application-to-adjudicating-authority-rules-2016-official.pdf",
    format: "PDF",
    badgeColor: "border-[#cbe0f2] bg-[#edf4fa] text-[#2c5478]",
  },
  {
    id: "ibbi-cirp-regulations",
    title: "IBBI (Insolvency Resolution Process) Regulations, 2016",
    category: "Official Gazette & Rules",
    sourceName: "Insolvency and Bankruptcy Board of India",
    fileSize: "1.95 MB",
    description:
      "Consolidated IBBI regulatory framework covering claims verification, Committee of Creditors (CoC) voting, Resolution Professional duties, and Information Utility filings.",
    testingRole: "Regulatory provenance library for cross-checking CIRP compliance workflows.",
    href: "/test-docs/ibbi-cirp-regulations-2016-official.pdf",
    format: "PDF",
    badgeColor: "border-[#cbe0f2] bg-[#edf4fa] text-[#2c5478]",
  },
  {
    id: "ibc-section-7-statute",
    title: "IBC Section 7 — Statute Extract (Financial Creditor CIRP)",
    category: "Official Gazette & Rules",
    sourceName: "India Code / eCourts Statute Repository",
    fileSize: "9.2 KB",
    description:
      "Verbatim statutory text of Section 7 IBC 2016 governing initiation of CIRP by a financial creditor. Used to verify Writer grounds a Section 7 petition on the correct provision.",
    testingRole: "Confirms lookup_statute materializes exact provision text as evidence.",
    href: "/test-docs/ibc-section-7-statute.pdf",
    format: "PDF",
    badgeColor: "border-[#cbe0f2] bg-[#edf4fa] text-[#2c5478]",
  },
  {
    id: "nesl-record-default",
    title: "NeSL Information Utility Record of Default (Form D Certificate)",
    category: "Evidence Dossiers",
    sourceName: "National E-Governance Services Ltd (IU)",
    fileSize: "9.6 KB",
    description:
      "Authenticated default certificate (UDI-2024-ND-883921) recording default date as 15.01.2023. Contains intentional date discrepancy against the bank ledger statement (28.02.2023).",
    testingRole: "Triggers Fact Reviewer discrepancy detection between NeSL IU record and the bank ledger.",
    href: "/test-docs/nesl-record-of-default.pdf",
    format: "PDF",
    badgeColor: "border-amber-200 bg-amber-50 text-amber-800",
  },
  {
    id: "facility-agreement",
    title: "Master Credit Facility Agreement: J&K Bank & Essel Infra (INR 24.5 Cr)",
    category: "Evidence Dossiers",
    sourceName: "Credit Agreement / Commercial Evidence",
    fileSize: "5.1 KB",
    description:
      "Term loan agreement dated 12.04.2019 establishing principal facility of INR 24.50 Crores, 11.25% interest rate, repayment schedule, and Clause 9 default events for Essel Infraprojects Ltd.",
    testingRole: "Tests financial contract ingestion and extraction of core debt parameters.",
    href: "/test-docs/sanction-facility-agreement.pdf",
    format: "PDF",
    badgeColor: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  {
    id: "ibbi-form-1-sample",
    title: "IBBI Form 1 Statutory CIRP Application (Case Dossier)",
    category: "Evidence Dossiers",
    sourceName: "Statutory Application Template",
    fileSize: "18.2 KB",
    description:
      "Official insolvency application by Jammu & Kashmir Bank against Essel Infraprojects Ltd claiming INR 29.82 Cr debt with primary default date 15.01.2023.",
    testingRole: "Tests Writer Agent pleading extraction and Fact Reviewer claim auditing.",
    href: "/test-docs/ibbi-form-1-application.pdf",
    format: "PDF",
    badgeColor: "border-purple-200 bg-purple-50 text-purple-800",
  },
  {
    id: "gst-tax-invoice",
    title: "GST Tax Invoice — Apex Logistics (INR 30.09 L, Overdue)",
    category: "Evidence Dossiers",
    sourceName: "Commercial Invoice / GST Evidence",
    fileSize: "4.1 KB",
    description:
      "GST-compliant tax invoice APX-GST/2023-24/0042 dated 28.02.2023 for freight, warehousing and last-mile delivery. Records a balance due of INR 30,09,000/- overdue since 31.03.2023.",
    testingRole:
      "Tests Writer drafting a Section 8/9 IBC demand from a GST invoice and Fact Reviewer detection of an unpaid operational debt. Pairs with the bank-ledger and Section 8 notice dossiers.",
    href: "/test-docs/gst-tax-invoice.pdf",
    format: "PDF",
    badgeColor: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  {
    id: "bank-ledger-statement",
    title: "Bank Account Ledger Statement — Essel Infra (Default 15.01.2023)",
    category: "Evidence Dossiers",
    sourceName: "Banking Record / Default Evidence",
    fileSize: "3.8 KB",
    description:
      "J&K Bank term-loan ledger recording EMI default on 15.01.2023 (discrepant with NeSL IU date 28.02.2023) and outstanding INR 3.07 Cr. Classifies the account as NPA on 10.03.2023.",
    testingRole:
      "Triggers Fact Reviewer to detect the date discrepancy between the bank ledger (15.01.2023) and the NeSL record of default (28.02.2023).",
    href: "/test-docs/bank-ledger-statement.pdf",
    format: "PDF",
    badgeColor: "border-amber-200 bg-amber-50 text-amber-800",
  },
  {
    id: "section-8-demand-notice",
    title: "Section 8 IBC Demand Notice — Apex Logistics → Essel Infra",
    category: "Evidence Dossiers",
    sourceName: "Statutory Demand Notice",
    fileSize: "4.5 KB",
    description:
      "Complete Section 8 IBC demand notice for INR 30,09,000/- calling upon Essel Infraprojects Ltd to pay within 10 days. Tied to the GST invoice and bank ledger dossiers.",
    testingRole:
      "Tests Writer agent's ability to draft a Section 9 IBC petition and Fact Reviewer verification of the 10-day demand period and debt amount.",
    href: "/test-docs/section-8-demand-notice.pdf",
    format: "PDF",
    badgeColor: "border-purple-200 bg-purple-50 text-purple-800",
  },
  {
    id: "legal-notice-section-80",
    title: "Section 80 CPC Legal Notice — Mehta Trading → Sterling Retail (INR 12.45 L)",
    category: "Evidence Dossiers",
    sourceName: "Pre-Suit Statutory Notice",
    fileSize: "3.5 KB",
    description:
      "Section 80 CPC notice giving 60 days to pay INR 12,45,000/- for supplied dry-groceries. Establishes a Contract Act recovery claim with GRN-acknowledged deliveries.",
    testingRole:
      "Tests Writer agent's ability to draft a commercial civil suit and Fact Reviewer verification of the 60-day statutory waiting period and debt amount.",
    href: "/test-docs/legal-notice-section-80-cpc.pdf",
    format: "PDF",
    badgeColor: "border-purple-200 bg-purple-50 text-purple-800",
  },
];

interface TestPrompt {
  id: string;
  title: string;
  matter: string;
  uploads: string;
  prompt: string;
  expect: string;
}

const TESTER_PLAYBOOK: TestPrompt[] = [
  {
    id: "tp-1",
    title: "End-to-end: Section 9 IBC petition from a GST invoice",
    matter: "Create a matter titled “Essel Infra — Operational Debt”",
    uploads: "gst-tax-invoice.pdf + bank-ledger-statement.pdf + section-8-demand-notice.pdf",
    prompt:
      "Draft a Section 9 IBC application by Apex Logistics against Essel Infraprojects Ltd for the unpaid operational debt of INR 30,09,000. Cite the GST invoice, the bank ledger default date, and confirm the 10-day Section 8 demand period was served.",
    expect:
      "Writer drafts a complete Form 5 petition with placeholders for IRP/Resolution Professional. Fact Reviewer flags the date discrepancy (15.01.2023 ledger vs 28.02.2023 NeSL). Citation Reviewer checks Section 8 & 9 IBC provisions.",
  },
  {
    id: "tp-2",
    title: "Citation hallucination trap (Pooja v. J&K Bank)",
    matter: "Create a matter titled “Citation Provenance Test”",
    uploads: "pooja-ramesh-singh-sc-2026.pdf",
    prompt:
      "Check every authority in this draft against the Supreme Court's 2026 ruling in Pooja Ramesh Singh and flag any hallucinated or non-existent citation.",
    expect:
      "Citation Reviewer reports identity, quotation, proposition-support and treatment. Any invented paragraph or fake precedent should surface as “unresolved/contradicted”.",
  },
  {
    id: "tp-3",
    title: "No-evidence draft (must NOT stop)",
    matter: "Create an empty matter titled “No Evidence Draft”",
    uploads: "(none — leave the matter empty)",
    prompt:
      "Draft a Section 7 IBC application by a financial creditor based on a default of INR 5 crore. I'll fill in the party names and dates later.",
    expect:
      "Writer proceeds using statutory + case-law research and inserts [PLACEHOLDER: …] tokens for the unknown party name, date and account number. The run must NOT fail with “no documents attached”.",
  },
  {
    id: "tp-4",
    title: "Fact discrepancy detection",
    matter: "Create a matter titled “Date Discrepancy Audit”",
    uploads: "nesl-record-of-default.pdf + bank-ledger-statement.pdf",
    prompt:
      "Audit the default date in this Matter. The NeSL record says 28.02.2023 and the bank ledger says 15.01.2023 — which one is the operational default date and why?",
    expect:
      "Fact Reviewer flags the two dates as “contradicted” across the two evidence spans and the Main Agent explains the discrepancy in one focused answer.",
  },
  {
    id: "tp-5",
    title: "Section 80 CPC commercial suit",
    matter: "Create a matter titled “Mehta v. Sterling Retail”",
    uploads: "legal-notice-section-80-cpc.pdf",
    prompt:
      "Prepare a commercial civil suit for recovery of INR 12,45,000 with 18% interest, grounded in the Section 80 CPC notice and the three acknowledged GRNs.",
    expect:
      "Writer drafts a plaint with the Contract Act s.73/74 claim, placeholders for court fees, and one unresolved question on whether limitation has run.",
  },
  {
    id: "tp-6",
    title: "General answer (no matter selected)",
    matter: "(no matter — Auto mode)",
    uploads: "(none)",
    prompt:
      "What are the grounds to initiate CIRP under Section 7 of the IBC and what evidence does a financial creditor need to show at the admission stage?",
    expect:
      "Main Agent answers from statutory + case-law research in iterative visible steps. It must NOT refuse for lack of an attached Matter.",
  },
];

export default function TestDocsPage() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: backendMatter } = useMatters();
  const createMatterMutation = useCreateMatter();
  const uploadSourceMutation = useUploadSource();
  const { data: threads } = useThreads(null);
  const deleteThreadMutation = useDeleteThread();

  const chatSessions = (threads ?? []).map((t) => {
    const linkedMatter = backendMatter?.find((m) => m.id === t.matter_id);
    return {
      id: t.id,
      title: t.title || "Untitled consultation",
      time: new Date(t.created_at).toLocaleDateString("en-IN"),
      matterId: t.matter_id,
      matterName: linkedMatter?.title,
    };
  });

  const matters: Matter[] = (backendMatter ?? []).map((m) => ({
    id: m.id,
    name: m.title,
    caseNumber: m.case_number ?? `MATTER-${m.id.slice(0, 6).toUpperCase()}`,
    court: m.court ?? "National Company Law Tribunal",
    stage: (m.stage as Matter["stage"]) || "Drafting",
    practiceArea: m.matter_type ?? "Insolvency (IBC)",
    lastActivity: `Updated ${new Date(m.updated_at).toLocaleDateString()}`,
    updatedAt: new Date(m.updated_at).getTime(),
    petitioner: "Client",
    respondent: "Corporate Debtor",
    matterType: (m.matter_type as Matter["matterType"]) || "Insolvency (IBC)",
    createdDate: new Date(m.created_at).toLocaleDateString(),
    health: "Healthy",
  }));

  const handleSelectNav = useCallback(
    (nav: string) => {
      setMobileNavOpen(false);
      if (nav === "agent") {
        router.push("/agent");
        return;
      }
      if (nav === "home" || nav === "profile" || nav === "settings") {
        router.push(nav === "home" ? "/workspace" : `/workspace?nav=${nav}`);
        return;
      }
      if (nav === "test-docs") {
        return;
      }
    },
    [router],
  );

  const handleSelectChatSession = useCallback(
    (threadId: string) => {
      router.push(`/agent?c=${threadId}`);
    },
    [router],
  );

  const handleDeleteChatSession = useCallback(
    async (threadId: string) => {
      try {
        await deleteThreadMutation.mutateAsync({ threadId });
      } catch {
        void 0;
      }
    },
    [deleteThreadMutation],
  );

  const handleCreateMatter = useCallback(
    async (newMatter: Matter) => {
      await createMatterMutation.mutateAsync({
        title: newMatter.name,
        case_number: newMatter.caseNumber,
        court: newMatter.court,
        matter_type: newMatter.matterType,
        stage: newMatter.stage,
      });
      setCreateOpen(false);
    },
    [createMatterMutation],
  );

  const handleUploadDocument = useCallback(
    async (data: {
      name: string;
      type: EvidenceType;
      matterId?: string;
      file?: File | null;
    }) => {
      if (!data.matterId || !data.file) {
        throw new Error("Select a matter and source file before uploading");
      }
      await uploadSourceMutation.mutateAsync({
        matterId: data.matterId,
        file: data.file,
      });
      setUploadOpen(false);
    },
    [uploadSourceMutation],
  );

  const filteredDocs = useMemo(() => {
    return TEST_DOCUMENTS.filter((doc) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = doc.title.toLowerCase().includes(q);
        const matchesDesc = doc.description.toLowerCase().includes(q);
        const matchesSource = doc.sourceName.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesSource) return false;
      }
      if (categoryFilter !== "all" && doc.category !== categoryFilter) {
        return false;
      }
      return true;
    });
  }, [searchQuery, categoryFilter]);

  const handleCopyPrompt = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      void 0;
    }
  }, []);

  return (
    <div className="flex h-screen w-full gap-1 overflow-hidden bg-[#eaf0f6] p-1 font-sans text-stone-900 antialiased sm:gap-1.5 sm:p-1.5 select-none">
      <AppSidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        onOpenCreateMatter={() => setCreateOpen(true)}
        onOpenUpload={() => setUploadOpen(true)}
        activeNav="test-docs"
        onSelectNav={handleSelectNav}
        chatSessions={chatSessions}
        onSelectChatSession={handleSelectChatSession}
        onDeleteChatSession={handleDeleteChatSession}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <button
        type="button"
        onClick={() => setMobileNavOpen(true)}
        aria-label="Open workspace navigation"
        className="fixed top-3 left-3 z-40 flex h-9 w-9 items-center justify-center rounded-md border border-[#cbe0f2] bg-white text-[#487aa8] shadow-sm transition-colors hover:bg-[#edf4fa] focus-visible:ring-2 focus-visible:ring-[#487aa8] focus-visible:outline-none md:hidden"
      >
        <PanelLeftIcon size={17} />
      </button>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-stone-200/90 bg-white shadow-2xs md:pt-0">
        <header className="flex flex-col gap-3 border-b border-stone-200/90 px-6 py-4 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="m-0 font-sans text-lg font-semibold text-stone-950 sm:text-xl">
                  Test Library &amp; Evidence Repository
                </h1>
                <span className="rounded-sm bg-[#edf4fa] px-2 py-0.5 text-[10.5px] font-medium text-[#2c5478] border border-[#cbe0f2]">
                  {TEST_DOCUMENTS.length} Matter &amp; Benchmark Documents
                </span>
              </div>
              <p className="mt-1 text-xs text-stone-500 max-w-2xl">
                Official Gazette statutes, Supreme Court landmark rulings on AI hallucinations, and
                benchmark evidence dossiers for testing Veritas workflows end to end.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push("/agent")}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#cbe0f2] bg-[#edf4fa] px-3 text-xs font-semibold text-[#2c5478] hover:bg-[#dce9f4] transition-colors cursor-pointer"
              >
                <span>Open Agent</span>
              </button>
              <button
                type="button"
                onClick={() => router.push("/workspace")}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#487aa8] px-3 text-xs font-semibold text-white shadow-2xs hover:bg-[#38648c] transition-colors cursor-pointer"
              >
                <span>Go to Workspace</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 pt-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  "all",
                  "Official Gazette & Rules",
                  "Court Precedents",
                  "Evidence Dossiers",
                ] as const
              ).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                    categoryFilter === cat
                      ? "bg-[#487aa8] text-white font-semibold shadow-2xs"
                      : "text-stone-600 hover:bg-[#edf4fa] hover:text-[#487aa8]"
                  }`}
                >
                  {cat === "all" ? "All Documents" : cat}
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
                aria-label="Search test documents"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents by title, source or keyword…"
                className="h-8 w-56 rounded-md border border-stone-200 bg-white pr-2.5 pl-8 text-xs text-stone-800 shadow-2xs placeholder:text-stone-400 focus-visible:border-[#487aa8] focus-visible:ring-2 focus-visible:ring-[#487aa8]/15 focus-visible:outline-none sm:w-72"
              />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:p-6 bg-[#fafbfc]">
          {/* ---- Tester Playbook ---- */}
          <section className="mb-6 rounded-xl border border-[#cbe0f2] bg-gradient-to-br from-[#f7fbfe] to-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-stone-950">
                  Tester Playbook — copy-paste prompts for proper testing
                </h2>
                <p className="mt-1 text-xs text-stone-500 max-w-3xl">
                  Each scenario tells you which Matter to create, which PDFs to upload into it, the
                  exact prompt to paste into the Agent, and what to expect. Follow them in order to
                  exercise drafting, fact review, citation review and the no-evidence fallback.
                </p>
              </div>
              <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10.5px] font-semibold text-emerald-700">
                {TESTER_PLAYBOOK.length} test scenarios
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
              {TESTER_PLAYBOOK.map((tp) => (
                <div
                  key={tp.id}
                  className="flex flex-col rounded-lg border border-stone-200 bg-white p-3.5 hover:border-[#487aa8]/60 transition-colors"
                >
                  <h3 className="text-[13px] font-semibold text-stone-900 leading-snug">
                    {tp.title}
                  </h3>
                  <dl className="mt-2 space-y-1 text-[11.5px] leading-relaxed">
                    <div className="flex gap-1.5">
                      <dt className="font-semibold text-[#2c5478] shrink-0">Matter:</dt>
                      <dd className="text-stone-700">{tp.matter}</dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt className="font-semibold text-[#2c5478] shrink-0">Upload:</dt>
                      <dd className="text-stone-700">{tp.uploads}</dd>
                    </div>
                  </dl>
                  <div className="mt-2.5 rounded-md border border-[#cbe0f2]/80 bg-[#f4f8fc] p-2.5">
                    <p className="text-[11px] leading-relaxed text-stone-800">
                      <span className="font-semibold text-[#2c5478]">Prompt: </span>
                      {tp.prompt}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleCopyPrompt(tp.prompt, tp.id)}
                      className="mt-2 inline-flex h-6 items-center gap-1.5 rounded border border-stone-200 bg-white px-2 text-[10.5px] font-medium text-stone-700 hover:border-[#487aa8] hover:bg-[#edf4fa] hover:text-[#2c5478] transition-colors cursor-pointer"
                      aria-label="Copy prompt to clipboard"
                    >
                      {copiedId === tp.id ? (
                        <>
                          <CheckIcon size={11} className="text-emerald-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <CopyIcon size={11} />
                          <span>Copy prompt</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-stone-600">
                    <span className="font-semibold text-stone-800">Expect: </span>
                    {tp.expect}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ---- Document grid ---- */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="group flex flex-col justify-between rounded-xl border border-stone-200/90 bg-white p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-[#487aa8]/60 hover:shadow-[0_4px_16px_rgba(44,84,120,0.08)] transition-all duration-200"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-[11px] font-semibold border ${doc.badgeColor}`}
                    >
                      {doc.category}
                    </span>
                    <span className="text-[11.5px] font-mono text-stone-400 font-medium">
                      {doc.fileSize}
                    </span>
                  </div>

                  <div className="flex items-start gap-3 pt-0.5">
                    <ColoredFileIcon format={doc.format} size="md" />
                    <div className="min-w-0 flex-1">
                      <h3
                        onClick={() => window.open(doc.href, "_blank", "noopener,noreferrer")}
                        className="text-[13px] font-semibold text-stone-900 group-hover:text-[#2c5478] transition-colors leading-snug cursor-pointer line-clamp-2"
                        title={doc.title}
                      >
                        {doc.title}
                      </h3>
                      <p className="mt-1 text-xs text-stone-500 font-medium truncate" title={doc.sourceName}>
                        {doc.sourceName}
                      </p>
                    </div>
                  </div>

                  <p className="mt-2.5 text-xs leading-relaxed text-stone-600 line-clamp-3">
                    {doc.description}
                  </p>

                  <div className="mt-3.5 rounded-lg border border-[#cbe0f2]/80 bg-[#f4f8fc] p-2.5 text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#487aa8]" aria-hidden="true" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#2c5478]">
                        Workflow Benchmark Utility
                      </span>
                    </div>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-stone-700">
                      {doc.testingRole}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3.5 border-t border-stone-100 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center rounded px-2 py-0.5 text-[10.5px] font-mono font-medium text-stone-600 bg-stone-100 border border-stone-200/60">
                    {doc.format}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => window.open(doc.href, "_blank", "noopener,noreferrer")}
                      className="inline-flex h-7 items-center gap-1.5 rounded-md border border-stone-200/90 bg-white px-2.5 text-xs font-medium text-stone-700 hover:border-[#487aa8] hover:bg-[#edf4fa] hover:text-[#2c5478] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#487aa8]/30 transition-colors cursor-pointer shadow-2xs"
                      aria-label={`Preview ${doc.title}`}
                      title="Preview PDF in new tab"
                    >
                      <EyeIcon size={12} />
                      <span>Preview</span>
                    </button>
                    <a
                      href={doc.href}
                      download
                      className="inline-flex h-7 items-center gap-1.5 rounded-md bg-[#2c5478] px-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#234361] active:bg-[#1c3650] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c5478]/30 transition-colors cursor-pointer"
                      aria-label={`Download ${doc.title}`}
                      title="Download PDF"
                    >
                      <DownloadIcon size={11} />
                      <span>Download</span>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredDocs.length === 0 && (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[#b9d1e5] bg-white p-8 text-center">
              <span className="text-sm font-semibold text-stone-700">No documents match your search</span>
              <p className="text-xs text-stone-500 mt-1">Try clearing the search query or category filter.</p>
            </div>
          )}

          {/* ---- How to test (upload into a Matter) ---- */}
          <section className="mt-6 rounded-xl border border-stone-200/90 bg-[#f7fbfe] p-5">
            <h2 className="text-sm font-semibold text-stone-950">
              How to test these PDFs end to end
            </h2>
            <ol className="mt-3 space-y-2 text-xs leading-relaxed text-stone-700 list-decimal pl-5 marker:font-semibold marker:text-[#487aa8]">
              <li>
                Click <span className="font-semibold">“Go to Workspace”</span> above and create a new
                Matter (e.g. “Essel Infra — Operational Debt”).
              </li>
              <li>
                Open the Matter, click <span className="font-semibold">Upload Document</span>, and
                upload one or more of the Evidence Dossier PDFs above (e.g. the GST invoice + bank
                ledger + Section 8 demand notice).
              </li>
              <li>
                Open the Agent from the sidebar, select that Matter in the composer, then paste one of
                the Tester Playbook prompts above and send it.
              </li>
              <li>
                Watch the Agent work in visible iterative steps (research → drafting → fact review →
                citation review). Open the resulting draft in <span className="font-semibold">/drafting</span> to inspect
                evidence spans, placeholders and review findings.
              </li>
            </ol>
            <p className="mt-3 text-[11px] text-stone-500">
              Tip: the no-evidence scenario (#3) deliberately uses an empty Matter to verify the Agent
              drafts from statutory + case-law research with placeholders instead of stopping.
            </p>
          </section>
        </div>
      </main>

      <CreateMatterModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreateMatter}
      />

      <UploadDocumentModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUpload={handleUploadDocument}
        matters={matters}
      />
    </div>
  );
}
