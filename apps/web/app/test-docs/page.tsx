import type { Metadata } from "next";
import Link from "next/link";
import {
  ExternalLinkIcon,
  DownloadIcon,
  ColoredFileIcon,
  ScaleIcon,
  BookOpenIcon,
  ArrowLeftIcon,
} from "../../components/workspace/workspace-icons";
import { VeritasOrb } from "../../components/brand/veritas-orb";

export const metadata: Metadata = {
  title: "Test Library & Evidence Fixtures | Veritas",
  description:
    "Official Indian insolvency statutes, Supreme Court landmark rulings on AI hallucinations, and benchmark evidence dossiers for testing Veritas multi-agent verification.",
};

interface ProblemStatementDocument {
  id: string;
  title: string;
  category: string;
  fileSize: string;
  description: string;
  testingRole: string;
  href: string;
  format: "PDF" | "TXT";
}

const PS_DOCUMENTS: ProblemStatementDocument[] = [
  {
    id: "pooja-sc-2026",
    title: "Supreme Court Landmark: Pooja Ramesh Singh v. J&K Bank",
    category: "2026 INSC 668",
    fileSize: "9.6 KB",
    description:
      "Landmark ruling quashing NCLT/NCLAT orders due to AI-hallucinated citations and fictitious legal precedents. Mandates human-in-the-loop citation provenance before CIRP admission.",
    testingRole: "Verifies Citation Reviewer detects hallucinated citations and flags unverified precedents.",
    href: "/test-docs/pooja-ramesh-singh-sc-2026.pdf",
    format: "PDF",
  },
  {
    id: "ibc-s7-statute",
    title: "IBC 2016 Section 7 & Limitation Act Extract",
    category: "Statutory Core",
    fileSize: "5.0 KB",
    description:
      "Core statutory framework for financial creditor CIRP initiation, default definitions under Section 3(12), Article 137 limitation period, and Section 18 debt acknowledgments.",
    testingRole: "Provides ground-truth legal authority for limitation defense and threshold compliance.",
    href: "/test-docs/ibc-section-7-statute.pdf",
    format: "PDF",
  },
  {
    id: "ibbi-form-1",
    title: "IBBI Form 1 Statutory Application (CIRP Section 7)",
    category: "Rule 4 Application",
    fileSize: "18.2 KB",
    description:
      "Official insolvency application by Jammu & Kashmir Bank against Essel Infraprojects Ltd claiming INR 29.82 Cr debt with primary default date 15.01.2023.",
    testingRole: "Tests Writer Agent pleading extraction and Fact Reviewer claim auditing.",
    href: "/test-docs/ibbi-form-1-application.pdf",
    format: "PDF",
  },
  {
    id: "facility-agreement",
    title: "Master Credit Facility Agreement (INR 24.50 Cr)",
    category: "Contract Evidence",
    fileSize: "5.1 KB",
    description:
      "Term loan agreement dated 12.04.2019 establishing principal facility, 11.25% interest, repayment milestones, and Clause 9 default events for Essel Infraprojects Ltd.",
    testingRole: "Tests financial contract ingestion and extraction of core debt parameters.",
    href: "/test-docs/sanction-facility-agreement.pdf",
    format: "PDF",
  },
  {
    id: "nesl-record-default",
    title: "NeSL Information Utility Record of Default (Form D)",
    category: "IU Authentication",
    fileSize: "9.6 KB",
    description:
      "Authenticated default certificate (UDI-2024-ND-883921) recording default date as 15.01.2023. Contains documented date discrepancy against Annexure B ledger statement (28.02.2023).",
    testingRole: "Triggers Fact Reviewer discrepancy detection between NeSL IU record and bank ledger.",
    href: "/test-docs/nesl-record-of-default.pdf",
    format: "PDF",
  },
];

interface PublicRepositorySource {
  title: string;
  source: string;
  purpose: string;
  href: string;
}

const EXTERNAL_REPOSITORIES: PublicRepositorySource[] = [
  {
    title: "Insolvency and Bankruptcy Board of India (IBBI)",
    source: "Official Regulator",
    purpose: "Consolidated regulatory framework, model CIRP regulations, and circulars.",
    href: "https://ibbi.gov.in/en/legal-framework",
  },
  {
    title: "Supreme Court of India Case Archive",
    source: "Judicial Repository",
    purpose: "Landmark orders and judgment transcripts for case law provenance checks.",
    href: "https://www.sci.gov.in/landmark-judgment-summaries/",
  },
  {
    title: "India Code Legislation Portal",
    source: "Ministry of Law & Justice",
    purpose: "Authentic legislative enactments and digital Gazette notifications.",
    href: "https://www.indiacode.nic.in/",
  },
  {
    title: "National Company Law Tribunal (NCLT)",
    source: "Adjudicating Authority",
    purpose: "Tribunal orders, cause lists, and insolvency admission notices.",
    href: "https://nclt.gov.in/",
  },
];

export default function TestDocsPage() {
  return (
    <main className="min-h-screen bg-[#f8fbfe] text-[#17212b]">
      <header className="sticky top-0 z-30 border-b border-[#cbe0f2]/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/workspace"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-stone-200 text-stone-600 hover:border-[#cbe0f2] hover:bg-[#edf4fa] hover:text-[#487aa8] transition-colors"
              title="Return to Workspace"
            >
              <ArrowLeftIcon size={15} />
            </Link>
            <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-85">
              <VeritasOrb size={22} className="text-[#487aa8]" />
              <span className="font-display text-lg font-medium text-stone-900">Veritas</span>
            </Link>
            <span className="text-stone-300">|</span>
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider font-mono">
              Test Library
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/agent"
              className="inline-flex h-8.5 items-center gap-2 rounded-full border border-[#cbe0f2] bg-[#edf4fa] px-3.5 text-xs font-semibold text-[#2c5478] hover:bg-[#dce9f4] transition-colors"
            >
              <span>Open Agent Chat</span>
            </Link>
            <Link
              href="/workspace"
              className="inline-flex h-8.5 items-center gap-2 rounded-full bg-[#487aa8] px-4 text-xs font-semibold text-white shadow-2xs hover:bg-[#38648c] transition-colors"
            >
              <span>Workspace Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#cbe0f2] bg-[#edf4fa] px-3 py-1 text-xs font-semibold text-[#2c5478] mb-3">
            <ScaleIcon size={13} />
            <span>Problem Statement Benchmark Fixtures</span>
          </div>
          <h1 className="font-display text-3xl font-medium tracking-tight text-[#162736] sm:text-4xl">
            Test Documents & Evidence Library
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#55697a]">
            Download these genuine test fixtures to evaluate the Veritas multi-agent legal assistant.
            Grounded in the landmark ruling <span className="font-semibold text-[#183f60]">Pooja Ramesh Singh v. J&K Bank (2026 INSC 668)</span>,
            these documents demonstrate how Citation Reviewer prevents AI hallucinations and Fact Reviewer detects ledger date conflicts.
          </p>
        </div>

        <section className="mb-12">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-stone-900">
                Primary Problem Statement Fixtures
              </h2>
              <p className="text-xs text-stone-500">
                Ready-to-upload legal PDFs for testing drafting, fact auditing, and citation verification.
              </p>
            </div>
            <span className="rounded-full bg-[#edf4fa] px-2.5 py-0.5 text-xs font-mono font-medium text-[#2c5478]">
              {PS_DOCUMENTS.length} Documents
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PS_DOCUMENTS.map((doc) => (
              <div
                key={doc.id}
                className="group flex flex-col justify-between rounded-xl border border-[#cbe0f2]/90 bg-white p-5 shadow-2xs transition-all hover:border-[#7fa9cc] hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="shrink-0 p-1 rounded-lg bg-[#f4f8fc] border border-[#dce9f4]">
                      <ColoredFileIcon format={doc.format} size="md" />
                    </div>
                    <span className="rounded-full border border-[#cbe0f2] bg-[#edf4fa] px-2 py-0.5 text-[10.5px] font-semibold text-[#2c5478]">
                      {doc.category}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-stone-900 group-hover:text-[#2c5478] transition-colors leading-snug">
                    {doc.title}
                  </h3>

                  <p className="mt-2 text-xs leading-relaxed text-stone-600 line-clamp-3">
                    {doc.description}
                  </p>

                  <div className="mt-3 rounded-lg border border-amber-200/80 bg-amber-50/70 p-2.5">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-800 font-mono">
                      Test Evaluation Role
                    </span>
                    <span className="block text-[11px] text-amber-900 leading-tight mt-0.5">
                      {doc.testingRole}
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-3.5">
                  <span className="text-[11px] font-mono text-stone-400">
                    {doc.fileSize} • {doc.format}
                  </span>

                  <div className="flex items-center gap-2">
                    <a
                      href={doc.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-7.5 items-center gap-1.5 rounded-md border border-stone-200 px-2.5 text-xs font-semibold text-stone-600 hover:border-[#cbe0f2] hover:bg-[#edf4fa] hover:text-[#2c5478] transition-colors cursor-pointer"
                      title="Preview in new tab"
                    >
                      <ExternalLinkIcon size={12} />
                      <span>Preview</span>
                    </a>
                    <a
                      href={doc.href}
                      download
                      className="inline-flex h-7.5 items-center gap-1.5 rounded-md bg-[#487aa8] px-3 text-xs font-semibold text-white shadow-2xs hover:bg-[#38648c] active:bg-[#2c5478] transition-colors cursor-pointer"
                      title="Download PDF file"
                    >
                      <DownloadIcon size={12} />
                      <span>Download</span>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-stone-900">
              Official Reference Repositories
            </h2>
            <p className="text-xs text-stone-500">
              Government portals and judicial archives used by Veritas for statutory citation verification.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {EXTERNAL_REPOSITORIES.map((repo) => (
              <a
                key={repo.title}
                href={repo.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col justify-between rounded-xl border border-stone-200 bg-white p-4 shadow-2xs hover:border-[#cbe0f2] hover:bg-[#f7fbfe] transition-all"
              >
                <div>
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#487aa8]">
                    {repo.source}
                  </span>
                  <h3 className="mt-1 text-xs font-semibold text-stone-800 group-hover:text-[#2c5478] transition-colors">
                    {repo.title}
                  </h3>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-stone-500">
                    {repo.purpose}
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-[11px] font-semibold text-[#487aa8] group-hover:text-[#2c5478]">
                  <span>Visit portal</span>
                  <ExternalLinkIcon size={11} />
                </div>
              </a>
            ))}
          </div>
        </section>

        <div className="rounded-xl border border-[#cbe0f2] bg-[#edf4fa] p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#487aa8] text-white">
              <BookOpenIcon size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#183f60]">
                How to Test Veritas with these Fixtures:
              </h3>
              <ol className="mt-2 list-decimal pl-4 space-y-1 text-xs text-[#35526d]">
                <li>Download <span className="font-semibold">pooja-ramesh-singh-sc-2026.pdf</span> and <span className="font-semibold">nesl-record-of-default.pdf</span> above.</li>
                <li>Go to the <Link href="/workspace" className="font-semibold underline hover:text-[#183f60]">Workspace</Link> and click <span className="font-semibold">New Matter</span> (or attach existing Matter).</li>
                <li>Upload the downloaded files using the <span className="font-semibold">+ button</span> in the Agent Chat composer.</li>
                <li>Ask Veritas to: <span className="italic font-mono">&quot;Audit citations and fact claims for Section 7 filing against Pooja Ramesh Singh&quot;</span>.</li>
                <li>Watch the Citation Reviewer detect the fictitious precedent and Fact Reviewer highlight the NeSL date discrepancy!</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-stone-200/80 bg-white py-6 text-center text-xs text-stone-500 font-sans">
        Veritas Evidence-Grounded Legal Workspace • Indian Insolvency &amp; Bankruptcy Code, 2016
      </footer>
    </main>
  );
}
