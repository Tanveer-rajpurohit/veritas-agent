import { SectionTitle } from "./cards";
import { Reveal } from "./motion";

const DOCS = [
  {
    name: "Loan sanction letter",
    meta: "PDF · 14 pages",
    excerpt: "Sanctioned limit of ₹4.85 crore, disbursed in two tranches against plant machinery.",
    tag: "Ledger figure",
    tagTone: "bg-info-wash text-info-ink",
  },
  {
    name: "Bank demand certificate",
    meta: "PDF · 3 pages",
    excerpt: "Total outstanding of ₹5.20 crore remains unpaid as on 14 March 2025.",
    tag: "Conflicts",
    tagTone: "bg-warn-wash text-warn-ink",
  },
  {
    name: "Default notice",
    meta: "DOCX · 2 pages",
    excerpt: "Called upon to clear dues of ₹5.20 crore within fourteen days of receipt.",
    tag: "Supports",
    tagTone: "bg-ok-wash text-ok-ink",
  },
  {
    name: "IBC Section 7 note",
    meta: "TXT · curated",
    excerpt: "A financial creditor may seek insolvency once a qualifying default is shown.",
    tag: "Authority",
    tagTone: "bg-info-wash text-info-ink",
  },
];

function DocIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-primary">
      <path d="M6 2.5h8L19 8v13.5H6V2.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M13.5 2.5V8.5H19" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 12.5h6M9 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function MatterDocs() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pt-16 sm:px-8">
      <Reveal>
        <SectionTitle
          title="The matter file, page by page."
          copy="Four records go in. Each one comes back with page numbers, extraction status and the exact lines your brief may cite."
        />
      </Reveal>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {DOCS.map((doc, index) => (
          <Reveal key={doc.name} delay={Math.min(index * 0.06, 0.18)}>
            <article className="flex h-full flex-col rounded-lg border border-border bg-white p-5 shadow-[0_1px_2px_rgb(23_23_23/6%),0_4px_12px_rgb(23_23_23/8%)] transition-all hover:-translate-y-0.5 hover:border-line-strong">
              <div className="flex items-start justify-between gap-2 pb-3">
                <DocIcon />
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${doc.tagTone}`}>{doc.tag}</span>
              </div>
              <h3 className="m-0 pb-1 text-[15px] font-semibold text-foreground">{doc.name}</h3>
              <p className="m-0 pb-3 font-mono text-[11px] text-ink-muted">{doc.meta} · Ready</p>
              <p className="m-0 mt-auto border-t border-border pt-3 text-[13px] leading-relaxed text-ink">
                “{doc.excerpt}”
              </p>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
