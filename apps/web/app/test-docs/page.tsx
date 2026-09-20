import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLinkIcon, DownloadIcon, FileTextIcon, GavelIcon, ScaleIcon, BookOpenIcon, LandmarkIcon } from "../../components/workspace/workspace-icons";
import { VeritasOrb } from "../../components/brand/veritas-orb";

export const metadata: Metadata = {
  title: "Test library | Veritas",
  description: "Public synthetic and official documents for testing the Veritas evidence workflow.",
};

type TestDocument = {
  title: string;
  kind: "Official source" | "Synthetic fixture";
  purpose: string;
  href: string;
};

const TEST_DOCUMENTS: TestDocument[] = [
  {
    title: "Insolvency and Bankruptcy Code, 2016",
    kind: "Official source",
    purpose: "Core statute for Section 7, default, limitation, and moratorium checks.",
    href: "https://www.indiacode.nic.in/bitstream/123456789/15479/1/the_insolvency_and_bankruptcy_code%2C_2016.pdf",
  },
  {
    title: "IBC 2016 — IBBI consolidated copy",
    kind: "Official source",
    purpose: "Alternative official-hosted copy for testing source comparison.",
    href: "https://ibbi.gov.in/uploads/legalframwork/e9cca2f4d2cf3508f3c823f070429be8.pdf",
  },
  {
    title: "IBC 2016 — THC India copy",
    kind: "Official source",
    purpose: "A second public statute source with a different update date.",
    href: "https://thc.nic.in/Central%20Governmental%20Acts/Insolvency%20and%20Bankruptcy%20Code,%202016.pdf",
  },
  {
    title: "IBBI regulations and circulars",
    kind: "Official source",
    purpose: "Public regulatory material for provenance and retrieval testing.",
    href: "https://ibbi.gov.in/en/legal-framework",
  },
  {
    title: "IBBI forms and downloads",
    kind: "Official source",
    purpose: "Public forms and procedural documents related to insolvency filings.",
    href: "https://ibbi.gov.in/en/home/downloads",
  },
  {
    title: "Supreme Court landmark judgment summaries",
    kind: "Official source",
    purpose: "Public case-summary source for citation discovery and limitations.",
    href: "https://www.sci.gov.in/landmark-judgment-summaries/",
  },
  {
    title: "Indian Kanoon public case search",
    kind: "Official source",
    purpose: "Public judgment discovery source; search results remain candidates until verified.",
    href: "https://indiankanoon.org/",
  },
  {
    title: "India Code public repository",
    kind: "Official source",
    purpose: "Public legislation source used to compare statute provenance.",
    href: "https://www.indiacode.nic.in/",
  },
  {
    title: "MCA company master data catalogue",
    kind: "Official source",
    purpose: "Public company identity data; it cannot establish debt or default.",
    href: "https://www.data.gov.in/catalog/company-master-data",
  },
  {
    title: "NCLT public orders and notices",
    kind: "Official source",
    purpose: "Public tribunal material for authority and document provenance checks.",
    href: "https://nclt.gov.in/",
  },
  {
    title: "eCourts India legal data API documentation",
    kind: "Official source",
    purpose: "Provider documentation for statute lookup integration.",
    href: "https://indiacode.ecourtsindia.com/api/v1/openapi.json",
  },
  {
    title: "Synthetic Matter record",
    kind: "Synthetic fixture",
    purpose: "A safe local fixture for testing upload, extraction, and fact-conflict workflows.",
    href: "/test-docs/veritas-synthetic-matter.txt",
  },
];

export default function TestDocsPage() {
  return (
    <main className="min-h-screen bg-[#fbfcfd] text-[#17212b]">
      <header className="border-b border-[#dce7f0] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-2.5 text-[#183f60]">
            <VeritasOrb size={28} />
            <span className="font-display text-xl">Veritas</span>
          </Link>
          <Link href="/workspace" className="text-sm font-semibold text-[#315f86] hover:text-[#244b6d]">
            Open workspace
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 pb-8 pt-14">
        <p className="text-sm font-medium text-[#d0784c]">Public test library</p>
        <h1 className="mt-3 max-w-2xl font-display text-5xl leading-[1.02] tracking-[-.04em] text-[#183f60]">
          Documents for trying the evidence workflow.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-[#60788c]">
          Open a public source, download it, then upload it into a Matter. Use synthetic or properly redacted records for private evidence. Official links are provided for discovery and provenance testing, not as legal advice.
        </p>
      </section>

      <section className="mx-auto grid max-w-5xl gap-3 px-6 pb-16 sm:grid-cols-2 lg:grid-cols-3">
        {TEST_DOCUMENTS.map((document) => {
          const getIcon = () => {
            if (document.title.toLowerCase().includes("judgment") || document.title.toLowerCase().includes("case")) return <GavelIcon size={18} className="text-[#487aa8]" />;
            if (document.title.toLowerCase().includes("code") || document.title.toLowerCase().includes("statute") || document.title.toLowerCase().includes("act")) return <ScaleIcon size={18} className="text-[#487aa8]" />;
            if (document.title.toLowerCase().includes("regulations") || document.title.toLowerCase().includes("circulars")) return <BookOpenIcon size={18} className="text-[#487aa8]" />;
            if (document.title.toLowerCase().includes("repository") || document.title.toLowerCase().includes("catalogue") || document.title.toLowerCase().includes("nclt")) return <LandmarkIcon size={18} className="text-[#487aa8]" />;
            return <FileTextIcon size={18} className="text-[#487aa8]" />;
          };

          return (
            <article key={document.title} className="flex min-h-56 flex-col border border-[#dce7f0] bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                {getIcon()}
                <span className={`text-[10px] font-semibold ${document.kind === "Synthetic fixture" ? "text-[#9a603d]" : "text-[#47745d]"}`}>
                  {document.kind}
                </span>
              </div>
              <h2 className="mt-7 text-base font-semibold leading-6 text-[#244b6d]">{document.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-[#6a8193]">{document.purpose}</p>
              <div className="mt-5 flex items-center gap-2 border-t border-[#edf2f6] pt-4">
                <a href={document.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#315f86] hover:text-[#244b6d]">
                  <ExternalLinkIcon size={13} /> Open
                </a>
                <a href={document.href} download target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6a8193] hover:text-[#315f86]">
                  <DownloadIcon size={13} /> Download
                </a>
              </div>
            </article>
          );
        })}
      </section>

      <footer className="border-t border-[#dce7f0] bg-white px-6 py-8 text-center text-xs text-[#718697]">
        Use only synthetic or redacted records in a real Matter. Veritas working drafts require lawyer review.
      </footer>
    </main>
  );
}
