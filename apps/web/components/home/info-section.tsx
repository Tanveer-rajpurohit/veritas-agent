"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function InfoSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const para1Ref = useRef<HTMLParagraphElement>(null);
  const para2Ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      const p1Words = para1Ref.current?.querySelectorAll(".scroll-word");
      if (p1Words && p1Words.length > 0) {
        gsap.fromTo(
          p1Words,
          { opacity: 0.2, y: 2 },
          {
            opacity: 1,
            y: 0,
            stagger: 0.03,
            ease: "none",
            scrollTrigger: {
              trigger: para1Ref.current,
              start: "top 85%",
              end: "bottom 45%",
              scrub: 0.5,
            },
          }
        );
      }

      const p2Words = para2Ref.current?.querySelectorAll(".scroll-word");
      if (p2Words && p2Words.length > 0) {
        gsap.fromTo(
          p2Words,
          { opacity: 0.2, y: 2 },
          {
            opacity: 1,
            y: 0,
            stagger: 0.03,
            ease: "none",
            scrollTrigger: {
              trigger: para2Ref.current,
              start: "top 85%",
              end: "bottom 45%",
              scrub: 0.5,
            },
          }
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const text1 =
    "Indian litigation practices manage hundreds of pages across loan agreements, demand notices, and contradictory case annexures. Today, legal teams lose critical hours manually hunting for factual discrepancies between banking default certificates and filed pleadings. Veritas replaces this manual overhead with a deterministic evidence-verification engine that grounds every sentence directly in your matter records.";

  const text2 =
    "Beyond fast draft generation, Veritas enforces a strict 4-axis verification pipeline: confirming precedent existence, verifying verbatim quotations, testing legal proposition support, and checking current precedent validity. If a single word is modified, prior sign-offs auto-reset, ensuring no advocate or litigation team ever files an unverified or hallucinated citation in court.";

  const words1 = text1.split(" ");
  const words2 = text2.split(" ");

  return (
    <section
      id="product"
      ref={containerRef}
      className="w-full border-b border-stone-200 bg-white relative overflow-hidden"
    >
      <div className="w-full max-w-6xl lg:max-w-7xl mx-auto border-x border-stone-200 px-6 sm:px-10 lg:px-12 py-16 sm:py-24 flex flex-col items-start gap-8 sm:gap-12">
        {/* Top Badge matching SIH style */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50/80 px-3.5 py-1.5 shadow-xs">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#487aa8"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <rect x="9" y="9" width="6" height="6" />
              <line x1="9" y1="1" x2="9" y2="4" />
              <line x1="15" y1="1" x2="15" y2="4" />
              <line x1="9" y1="20" x2="9" y2="23" />
              <line x1="15" y1="20" x2="15" y2="23" />
              <line x1="20" y1="9" x2="23" y2="9" />
              <line x1="20" y1="14" x2="23" y2="14" />
              <line x1="1" y1="9" x2="4" y2="9" />
              <line x1="1" y1="14" x2="4" y2="14" />
            </svg>
            <span className="text-xs font-semibold text-stone-800 font-sans">
              Evidence-First Architecture
            </span>
          </div>
          <span className="text-xs font-mono text-stone-500 hidden sm:inline">
            Supreme Court Standards · 4-Axis Verification · Automatic Reset
          </span>
        </div>

        {/* The 2 Scroll-Illuminated Paragraphs (Compact, readable editorial font size) */}
        <div className="flex flex-col gap-6 sm:gap-8 max-w-4xl">
          <p
            ref={para1Ref}
            className="text-[15px] sm:text-[17px] md:text-[19px] lg:text-[21px] font-normal font-sans leading-[1.6] text-stone-900"
          >
            {words1.map((word, idx) => (
              <span
                key={idx}
                className="scroll-word inline-block mr-1.5 sm:mr-2 mb-0.5"
              >
                {word}
              </span>
            ))}
          </p>

          <p
            ref={para2Ref}
            className="text-[15px] sm:text-[17px] md:text-[19px] lg:text-[21px] font-normal font-sans leading-[1.6] text-stone-900"
          >
            {words2.map((word, idx) => (
              <span
                key={idx}
                className="scroll-word inline-block mr-1.5 sm:mr-2 mb-0.5"
              >
                {word}
              </span>
            ))}
          </p>
        </div>
      </div>
    </section>
  );
}
