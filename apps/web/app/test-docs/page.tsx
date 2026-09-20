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
    id: "nesl-record-default",
    title: "NeSL Information Utility Record of Default (Form D Certificate)",
    category: "Evidence Dossiers",
    sourceName: "National E-Governance Services Ltd (IU)",
    fileSize: "9.6 KB",
    description:
      "Authenticated default certificate (UDI-2024-ND-883921) recording default date as 15.01.2023. Contains intentional date discrepancy against Annexure B ledger statement (28.02.2023).",
    testingRole: "Triggers Fact Reviewer discrepancy detection between NeSL IU record and bank ledger.",
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
];

export default function TestDocsPage() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data: backendMatters } = useMatters();
  const createMatterMutation = useCreateMatter();
  const uploadSourceMutation = useUploadSource();
  const { data: threads } = useThreads(null);
  const deleteThreadMutation = useDeleteThread();

  const chatSessions = (threads ?? []).map((t) => {
    const linkedMatter = backendMatters?.find((m) => m.id === t.matter_id);
    return {
      id: t.id,
      title: t.title || "Untitled consultation",
      time: new Date(t.created_at).toLocaleDateString("en-IN"),
      matterId: t.matter_id,
      matterName: linkedMatter?.title,
    };
  });

  const matters: Matter[] = (backendMatters ?? []).map((m) => ({
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
                  {TEST_DOCUMENTS.length} Official &amp; Benchmark Documents
                </span>
              </div>
              <p className="mt-1 text-xs text-stone-500 max-w-2xl">
                Official Gazette statutes, Supreme Court landmark rulings on AI hallucinations, and benchmark evidence dossiers for testing Veritas workflows.
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
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="group flex flex-col justify-between rounded-lg border border-stone-200 bg-white p-4 shadow-2xs hover:border-[#487aa8]/50 hover:shadow-xs transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <span
                      className={`rounded-sm px-2 py-0.5 text-[10.5px] font-semibold border ${doc.badgeColor}`}
                    >
                      {doc.category}
                    </span>
                    <span className="text-[11px] font-mono text-stone-400">
                      {doc.fileSize}
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5 pt-0.5">
                    <ColoredFileIcon format={doc.format} size="md" />
                    <div className="min-w-0 flex-1">
                      <h3
                        onClick={() => window.open(doc.href, "_blank", "noopener,noreferrer")}
                        className="text-xs font-semibold text-stone-900 group-hover:text-[#2c5478] transition-colors leading-snug cursor-pointer line-clamp-2"
                        title={doc.title}
                      >
                        {doc.title}
                      </h3>
                      <p className="text-[10.5px] font-mono text-stone-500 pt-0.5 truncate">
                        {doc.sourceName}
                      </p>
                    </div>
                  </div>

                  <p className="mt-2.5 text-[11.5px] leading-relaxed text-stone-600 line-clamp-3">
                    {doc.description}
                  </p>

                  <div className="mt-3 rounded-md border border-amber-200/80 bg-amber-50/70 p-2 text-left">
                    <span className="block text-[9.5px] font-bold uppercase tracking-wider text-amber-800 font-mono">
                      Workflow Benchmark Utility
                    </span>
                    <span className="block text-[10.5px] text-amber-900 leading-tight mt-0.5">
                      {doc.testingRole}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-stone-500 font-medium">
                    {doc.format}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => window.open(doc.href, "_blank", "noopener,noreferrer")}
                      className="inline-flex h-6.5 items-center gap-1 rounded-md border border-stone-200 bg-white px-2.5 text-[11px] font-medium text-stone-700 hover:border-[#487aa8] hover:bg-[#edf4fa] hover:text-[#2c5478] transition-colors cursor-pointer shadow-2xs"
                      title="Preview PDF in new tab"
                    >
                      <EyeIcon size={12} />
                      <span>Preview</span>
                    </button>
                    <a
                      href={doc.href}
                      download
                      className="inline-flex h-6.5 items-center gap-1 rounded-md bg-[#487aa8] px-2.5 text-[11px] font-semibold text-white shadow-2xs hover:bg-[#38648c] active:bg-[#2c5478] transition-colors cursor-pointer"
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
