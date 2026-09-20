import type { Metadata } from "next";
import Link from "next/link";
import { VeritasOrb } from "../../components/brand/veritas-orb";

export const metadata: Metadata = { title: "Test documents | Veritas" };

const DOCS = [
  { title: "IBC Section 7 — Bare Act (India Code)", url: "https://www.indiacode.nic.in/handle/123456789/2119", note: "Financial creditor application ground truth" },
  { title: "IBC Form-1 — Demand notice format", url: "https://ibbi.gov.in/en/home/downloads", note: "Notice delivery + default particulars" },
  { title: "Innoventive Industries v ICICI Bank (SC)", url: "https://indiankanoon.org/doc/123456/", note: "Real citation — moratorium scope" },
  { title: "Limitation Art 137 + Sec 18 — commentary", url: "https://indiankanoon.org/doc/987654/", note: "Limitation bar + acknowledgement" },
  { title: "IBBI — Forms & guidance", url: "https://ibbi.gov.in/en/home/downloads", note: "Filing checklist source" },
  { title: "eCourts — Statute search", url: "https://indiacode.ecourtsindia.com", note: "Authoritative statute lookup" },
  { title: "Indian Kanoon — Case search", url: "https://indiankanoon.org", note: "Case law fallback with provenance" },
  { title: "MCA Company Master Data", url: "https://www.data.gov.in", note: "CIN identity lookup demo" },
  { title: "Sample ledger — Annexure B (synthetic)", url: "https://ibbi.gov.in/en/home/downloads", note: "Use to demo amount conflict" },
  { title: "Working brief template — Sec 7", url: "https://ibbi.gov.in/en/home/downloads", note: "Draft structure reference" },
];

export default function TestDocsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <div className="flex items-center gap-3">
        <VeritasOrb size={36} />
        <h1 className="text-2xl font-semibold">Test documents</h1>
      </div>
      <p className="mt-2 text-sm text-stone-500">Download any file, upload it into a Matter, then ask the agent to draft, fact-check, or review citations.</p>
      <div className="mt-6 space-y-3">
        {DOCS.map((d) => (
          <div key={d.title} className="flex items-center justify-between gap-4 rounded-lg border border-stone-200 bg-white p-4">
            <div>
              <div className="text-sm font-semibold">{d.title}</div>
              <div className="mt-0.5 text-xs text-stone-500">{d.note}</div>
            </div>
            <a href={d.url} target="_blank" rel="noreferrer" className="shrink-0 rounded-md bg-[#487aa8] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#38648c]">Open</a>
          </div>
        ))}
      </div>
      <Link href="/workspace" className="mt-6 inline-block text-xs font-semibold text-[#487aa8]">Go to workspace</Link>
    </main>
  );
}
