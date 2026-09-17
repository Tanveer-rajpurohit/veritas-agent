"use client";

import { Reveal } from "./motion";

interface StatItem {
  value: string;
  label: string;
}

interface CapabilityItem {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const STATS: StatItem[] = [
  { value: "0%", label: "Hallucinated Precedents" },
  { value: "4-Axis", label: "Independent Judicial Checks" },
  { value: "100%", label: "Page-Anchored Provenance" },
  { value: "2026 INSC", label: "Supreme Court Benchmark" },
];

const CAPABILITIES: CapabilityItem[] = [
  {
    title: "Deterministic Case Registry",
    description:
      "Direct integration with Supreme Court of India and High Court dockets. Matches cause title, bench, and year. If a citation does not exist on official dockets, it is flagged immediately.",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    title: "Verbatim Quote Matching",
    description:
      "Compares quoted sentences character-for-character against authentic judicial orders. Prevents generative models from fabricating paragraphs under authentic judicial titles.",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    title: "Banking Record Reconciliation",
    description:
      "Cross-checks arithmetic default figures across loan agreements, sanction letters, and certified default certificates, resolving conflicts before petition filing.",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    title: "Subsequent Treatment Citator",
    description:
      "Monitors appellate history across NCLAT and Supreme Court benches to confirm whether a precedent remains good law or was subsequently overruled or distinguished.",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "Automatic Reset on Revision",
    description:
      "Every modified sentence in the editor canvas automatically recalculates content hashes and resets prior sign-offs to Stale, guaranteeing zero uninspected edits.",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
    ),
  },
  {
    title: "Court-Ready Gated Export",
    description:
      "Generates draft briefs with comprehensive page-anchored evidence manifests and citation appendixes, locked until counsel resolves all blocking findings.",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
];

export function DraftReviewCards() {
  return (
    <section id="evidence" className="w-full border-b border-stone-200 bg-white">
      <div className="w-full max-w-6xl lg:max-w-7xl mx-auto border-x border-stone-200">
        <Reveal className="px-6 sm:px-10 lg:px-12 py-14 sm:py-18 border-b border-stone-200 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-3.5 py-1 text-xs font-semibold text-stone-700 shadow-2xs mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-[#487aa8]" />
            <span>Forensic Verification Standards</span>
          </div>
          <h2 className="text-stone-900 text-2xl sm:text-3xl md:text-5xl font-bold font-sans tracking-tight leading-[1.12] mb-3 max-w-3xl">
            Engineered for courtroom credibility
          </h2>
          <p className="text-stone-600 text-sm sm:text-base font-sans max-w-2xl leading-relaxed">
            Every judicial citation, statutory ratio, and banking default figure is verified against primary government dockets and certified client records before filing.
          </p>
        </Reveal>

        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-stone-200">
          {STATS.map((stat, idx) => (
            <div
              key={idx}
              className="p-6 sm:p-8 md:p-10 flex flex-col items-center justify-center gap-1 border-r border-b border-stone-200 last:border-r-0 [&:nth-child(2)]:border-r-0 sm:[&:nth-child(2)]:border-r [&:nth-child(3)]:border-b-0 [&:nth-child(4)]:border-b-0 sm:[&:nth-child(1)]:border-b-0 sm:[&:nth-child(2)]:border-b-0 transition-colors hover:bg-stone-50/60"
            >
              <div className="text-stone-800 text-3xl sm:text-4xl md:text-5xl font-normal font-sans tracking-tight">
                {stat.value}
              </div>
              <div className="text-stone-500 text-xs sm:text-[13px] font-sans font-normal text-center">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((item, idx) => (
            <div
              key={idx}
              className={`relative p-7 sm:p-8 md:p-9 flex flex-col justify-start border-stone-200 transition-colors hover:bg-stone-50/70 group overflow-hidden ${
                idx < 3 ? "lg:border-b" : ""
              } ${idx % 3 !== 2 ? "lg:border-r" : ""} ${
                idx < 4 ? "sm:max-lg:border-b" : ""
              } ${idx % 2 === 0 ? "sm:max-lg:border-r" : ""} border-b last:border-b-0 sm:border-b-0`}
            >
              <div
                className="absolute inset-0 bg-[#487aa8]/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out pointer-events-none z-0"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='1' height='1' fill='rgba(72, 122, 168, 0.25)'/%3E%3C/svg%3E")`,
                }}
              />

              <div className="relative z-10 pointer-events-none">
                <div className="flex items-center justify-between mb-5">
                  <div className="text-[#487aa8] group-hover:scale-110 transition-transform duration-300">
                    {item.icon}
                  </div>
                  <span className="font-mono text-xs font-semibold text-stone-400">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="text-base font-semibold font-sans text-stone-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-[13px] leading-relaxed text-stone-600 font-sans">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
