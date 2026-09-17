"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const capabilities = [
  {
    title: "Private matter isolation",
    description: "Private workspace isolation ensures client strategy notes and records are never shared or used to train external models.",
  },
  {
    title: "Factual discrepancy auditing",
    description: "Detects arithmetic and textual conflicts between loan agreements and certified bank default certificates in seconds.",
  },
  {
    title: "4-axis citation verification",
    description: "Independently validates case existence, verbatim quote fidelity, proposition support, and good-law validity.",
  },
  {
    title: "Court-ready citation annexures",
    description: "Export pristine draft briefs with complete page-anchored citation trails ready for senior advocate sign-off.",
  },
];

const workflow = [
  {
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    label: "Matter document intake",
    detail: "Agreements · demand notices · ledgers",
  },
  {
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    label: "Evidence verification engine",
    detail: "Detect · verify · cross-check",
  },
  {
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
    label: "Court-ready brief export",
    detail: "Verbatim quotes · page anchors",
  },
];

export function CapabilitiesSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".capability-card",
        { autoAlpha: 0, y: 22 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.09,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".capability-grid",
            start: "top 82%",
            once: true,
          },
        }
      );

      gsap.fromTo(
        ".workflow-panel",
        { autoAlpha: 0, x: 20 },
        {
          autoAlpha: 1,
          x: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".capability-grid",
            start: "top 80%",
            once: true,
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="capabilities"
      ref={sectionRef}
      className="w-full border-b border-stone-200 bg-white"
    >
      <div className="w-full max-w-6xl lg:max-w-7xl mx-auto border-x border-stone-200">
        <div className="px-6 sm:px-10 lg:px-12 py-16 sm:py-20 border-b border-stone-200">
          <div className="inline-flex items-center gap-2 rounded-md border border-stone-200 bg-stone-50/80 px-3.5 py-1.5 shadow-xs mb-5">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#487aa8"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="6" cy="19" r="3" />
              <path d="M9 19h8.5a4.5 4.5 0 0 0 0-9H7" />
              <circle cx="18" cy="5" r="3" />
            </svg>
            <span className="text-xs font-semibold text-stone-800 font-sans">
              Platform Capabilities
            </span>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12 lg:items-end">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#487aa8] mb-2.5">
                From fragmented case files to a court-ready brief
              </p>
              <h2 className="max-w-2xl font-sans text-2xl sm:text-3xl md:text-4xl font-bold leading-[1.12] tracking-tight text-stone-900">
                An evidence operations room, built for Indian litigation practices.
              </h2>
            </div>
            <p className="max-w-md text-sm sm:text-[15px] leading-relaxed text-stone-600 font-sans lg:pb-1">
              Veritas turns bulky case files and contradictory annexures into clear, verified pleadings with ironclad proof beside every sentence.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
          <div className="capability-grid grid sm:grid-cols-2 border-b lg:border-b-0 lg:border-r border-stone-200">
            {capabilities.map((capability, index) => {
              return (
                <article
                  key={capability.title}
                  className={`capability-card group min-h-48 p-5 sm:p-7 flex flex-col border-stone-200 transition-colors hover:bg-stone-50/70 ${
                    index < 2 ? "border-b" : ""
                  } ${index % 2 === 0 ? "sm:border-r" : ""}`}
                >
                  <span className="mb-auto font-mono text-3xl sm:text-4xl tracking-[-0.08em] text-stone-300 transition-colors duration-200 group-hover:text-[#487aa8]/60">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-6 font-sans text-sm sm:text-base font-semibold text-stone-900">
                    {capability.title}
                  </h3>
                  <p className="mt-1.5 max-w-xs font-sans text-[13px] leading-5 text-stone-600">
                    {capability.description}
                  </p>
                </article>
              );
            })}
          </div>

          <aside className="workflow-panel bg-stone-50/60 p-5 sm:p-7 md:p-8 flex flex-col justify-between gap-8">
            <div>
              <div className="flex items-center">
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-stone-500">
                  Veritas verification workflow
                </span>
              </div>
              <div className="mt-6 space-y-0">
                {workflow.map((step, index) => {
                  return (
                    <div key={step.label} className="relative flex gap-3.5 pb-6 last:pb-0">
                      {index < workflow.length - 1 && (
                        <span className="absolute left-[15px] top-7 h-[calc(100%-6px)] border-l border-dashed border-stone-300" />
                      )}
                      <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-white text-[#487aa8] shadow-xs">
                        {step.icon}
                      </div>
                      <div className="pt-0.5">
                        <p className="font-sans text-sm font-semibold text-stone-900">
                          {step.label}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] text-stone-500">
                          {step.detail}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-lg border border-stone-200 bg-white p-4 sm:p-5 shadow-xs">
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#487aa8] font-semibold">
                Designed for courtroom credibility
              </p>
              <p className="mt-1.5 font-sans text-base sm:text-lg font-medium leading-snug text-stone-900">
                Audit-ready, citation-linked, and built to survive senior judicial scrutiny.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

