"use client";

import { useState } from "react";
import { Reveal } from "./motion";

const PILL_TABS = [
  { id: "benefits", label: "Benefits" },
  { id: "citations", label: "4-Axis Citations" },
  { id: "stale", label: "Auto-Reset" },
  { id: "export", label: "Court Export" },
];

const NARRATIVE_STEPS = [
  {
    num: "01",
    title: "Spot Inconsistencies in Seconds",
    desc: "No more hunting through hundred-page loan files. Veritas automatically flags when the loan agreement (₹4.85 Cr) and the bank demand certificate (₹5.20 Cr) give differing numbers.",
  },
  {
    num: "02",
    title: "4-Axis Citation Verification",
    desc: "One generic green tick isn&apos;t enough for court. Veritas independently verifies whether the case exists, whether the quotation is verbatim, whether the ruling supports your proposition, and whether it&apos;s still good law.",
  },
  {
    num: "03",
    title: "Auto-Reset When You Edit",
    desc: "Whenever you modify a sentence, previous verification marks reset automatically. You never risk filing a draft where earlier approvals were invalidated by subsequent tweaks.",
  },
  {
    num: "04",
    title: "Court-Ready Export with Proof",
    desc: "Download clean draft PDFs with complete citation annexures. Final reviewed drafts remain protected until every flagged discrepancy has been settled.",
  },
];

const FEATURE_GRID = [
  {
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
    title: "Document-Grounded Drafting",
    desc: "Drafts are generated strictly from the client agreements and demand notices you upload, keeping factual assertions tethered to genuine pages.",
  },
  {
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
      </svg>
    ),
    title: "Practice Confidentiality",
    desc: "Every matter is privately isolated to your workspace. Your client records and strategy notes are never shared or used to train external models.",
  },
  {
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    title: "Protect Courtroom Credibility",
    desc: "Built directly to address real Supreme Court rulings where lawyers were sanctioned because AI invented legal paragraphs under genuine case names.",
  },
  {
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
      </svg>
    ),
    title: "Auditable Citation Trail",
    desc: "Every assertion has its exact page number and text attached, making it fast and effortless for senior advocates to review and sign off.",
  },
];

export function BigPicture() {
  const [activePill, setActivePill] = useState("benefits");

  return (
    <section id="overview" className="mx-auto w-full max-w-6xl px-5 pt-28 sm:px-8">
      <div className="flex justify-center pb-12">
        <div className="inline-flex items-center gap-1 rounded-md border border-stone-200/90 bg-white/85 p-1.5 shadow-xs backdrop-blur-md">
          {PILL_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActivePill(tab.id)}
              className={`rounded-md px-4 sm:px-5 py-1.5 text-xs sm:text-[13px] font-medium transition-all ${
                activePill === tab.id
                  ? "bg-[#487aa8] text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-950"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <Reveal className="max-w-3xl">
        <h2 className="font-display text-4xl sm:text-5xl font-normal tracking-tight text-stone-900">
          See the Big Picture
        </h2>
        <p className="pt-3 pb-8 text-base sm:text-lg text-stone-600 leading-relaxed">
          Veritas turns bulky case files and messy loan ledgers into clear, verified pleadings that show you exactly what is supported by the record.
        </p>
      </Reveal>

      <div className="divide-y divide-stone-200 border-t border-b border-stone-200">
        {NARRATIVE_STEPS.map((step, idx) => (
          <Reveal
            key={step.num}
            delay={idx * 0.05}
            className="grid py-6 sm:py-7 sm:grid-cols-[60px_1fr] md:grid-cols-[80px_240px_1fr] items-baseline gap-2 sm:gap-6 group hover:bg-[#f5f9fc]/70 transition-colors rounded-lg px-2 sm:px-4"
          >
            <span className="font-mono text-xs sm:text-sm font-semibold text-[#6292c1] group-hover:text-[#487aa8] transition-colors">
              {step.num}
            </span>
            <h3 className="text-base sm:text-lg font-semibold text-stone-900 tracking-tight">
              {step.title}
            </h3>
            <p className="text-sm sm:text-[15px] leading-relaxed text-stone-600">
              {step.desc}
            </p>
          </Reveal>
        ))}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 pt-16 pb-12">
        {FEATURE_GRID.map((feat, idx) => (
          <Reveal
            key={feat.title}
            delay={idx * 0.06}
            className="flex flex-col rounded-lg border border-stone-200/80 bg-[#f8fbfe] p-6 transition-all hover:-translate-y-1 hover:border-[#bed7ec] hover:bg-white hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-[#487aa8] shadow-xs border border-stone-200/60 mb-5">
              {feat.icon}
            </div>
            <h4 className="text-base font-semibold text-stone-900 pb-2 tracking-tight">
              {feat.title}
            </h4>
            <p className="text-[13px] leading-relaxed text-stone-600">
              {feat.desc}
            </p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
