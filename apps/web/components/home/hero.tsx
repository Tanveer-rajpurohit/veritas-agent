"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";

function EditPencilIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block"
      aria-hidden="true"
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

export function Hero() {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const envelopeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!titleRef.current) return;

    const words = titleRef.current.querySelectorAll<HTMLElement>(".hero-word");
    gsap.fromTo(
      words,
      { yPercent: 110, opacity: 0 },
      {
        yPercent: 0,
        opacity: 1,
        duration: 0.95,
        ease: "power4.out",
        stagger: 0.05,
        clearProps: "transform,opacity",
      },
    );

    if (envelopeRef.current) {
      gsap.fromTo(
        envelopeRef.current,
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1.1,
          delay: 0.2,
          ease: "power3.out",
          clearProps: "transform,opacity",
        },
      );
    }
  }, []);

  return (
    <section className="w-full relative">
      <div className="relative flex min-h-[44rem] w-full flex-col items-center overflow-hidden bg-[linear-gradient(180deg,#7aa0c6_0%,#96b7d7_45%,#d2e3f0_85%,#ecf3f9_100%)] pt-24 pb-6 text-center sm:min-h-[100dvh] sm:pt-32 sm:pb-10">
        <div
          className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[550px] w-[850px] rounded-full opacity-40 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(200,225,250,0.3) 60%, transparent 80%)",
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-5 text-center sm:px-6">
          <h1
            ref={titleRef}
            className="m-0 text-center font-sans text-[clamp(2.5rem,6vw,4.75rem)] leading-[1.02] font-bold tracking-[-0.045em] text-white drop-shadow-xs"
          >
            <span className="block overflow-hidden pb-1">
              <span className="hero-word inline-block mr-[0.25em]">
                Draft with the
              </span>
            </span>
            <span className="block overflow-hidden pb-1">
              <span className="hero-word inline-block">
                evidence beside you.
              </span>
            </span>
          </h1>

          <p className="m-0 max-w-md pt-4 pb-7 text-center font-sans text-sm leading-6 text-white/90 sm:max-w-xl sm:text-base sm:leading-7">
            Turn matter records into a working brief, check each claim against
            its source, and keep every review decision attached to the draft.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
            <Link
              href="/register"
              className="rounded-full bg-slate-950 hover:bg-black px-6 sm:px-7 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white no-underline shadow-md transition-all hover:scale-[1.02] active:scale-95"
            >
              Sign up for free
            </Link>
            <Link
              href="#product"
              className="rounded-full bg-white hover:bg-slate-50 px-6 sm:px-7 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-slate-900 no-underline shadow-xs transition-all hover:scale-[1.02] active:scale-95"
            >
              Book a demo
            </Link>
          </div>
        </div>

        <div
          ref={envelopeRef}
          className="relative z-20 mt-14 flex w-full max-w-full flex-col items-center overflow-hidden px-3 pt-4 select-none sm:mt-auto sm:px-4 sm:pt-10"
        >
          <div className="relative w-full max-w-[320px] sm:max-w-[420px] md:max-w-[480px] h-[160px] sm:h-[195px] md:h-[225px] flex items-end justify-center">
            {/* Background Fanned Document Silhouettes on Left (desktop only) */}
            <div
              className="pointer-events-none hidden sm:flex absolute -left-4 md:-left-7 bottom-5 md:bottom-7 h-20 md:h-24 w-28 md:w-36 -rotate-12 rounded-2xl border border-white/70 bg-white/45 p-3 shadow-xs backdrop-blur-xs flex-col justify-center gap-1.5"
              aria-hidden="true"
            >
              <div className="h-1.5 w-3/4 rounded-full bg-sky-200/80" />
              <div className="h-1.5 w-1/2 rounded-full bg-sky-200/80" />
              <div className="h-1.5 w-2/3 rounded-full bg-sky-200/80" />
            </div>

            {/* Background Fanned Document Silhouettes on Right (desktop only) */}
            <div
              className="pointer-events-none hidden sm:flex absolute -right-4 md:-right-7 bottom-5 md:bottom-7 h-20 md:h-24 w-28 md:w-36 rotate-12 rounded-2xl border border-white/70 bg-white/45 p-3 shadow-xs backdrop-blur-xs flex-col justify-center gap-1.5"
              aria-hidden="true"
            >
              <div className="h-1.5 w-3/4 rounded-full bg-sky-200/80" />
              <div className="h-1.5 w-1/2 rounded-full bg-sky-200/80" />
              <div className="h-1.5 w-2/3 rounded-full bg-sky-200/80" />
            </div>

            {/* Open Envelope Back Wall & Triangular Top Flap */}
            <div className="absolute inset-0 z-0 flex items-end">
              <svg
                viewBox="0 0 520 240"
                className="w-full h-full"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient
                    id="envBackGrad"
                    x1="0%"
                    y1="0%"
                    x2="0%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="50%" stopColor="#f4f8fb" />
                    <stop offset="100%" stopColor="#e5eff7" />
                  </linearGradient>
                </defs>
                <path
                  d="M 15 140 L 250 12 Q 260 8, 270 12 L 505 140 L 505 240 L 15 240 Z"
                  fill="url(#envBackGrad)"
                  stroke="#cbe0f2"
                  strokeWidth="1.5"
                />
              </svg>
            </div>

            {/* Sheet 1: Before (Left, tilted -6 deg, responsive size) */}
            <div className="absolute left-0 sm:left-2 md:left-4 bottom-16 sm:bottom-20 md:bottom-22 z-10 w-[9.5rem] sm:w-[12rem] md:w-[13.5rem] -rotate-6 rounded-xl sm:rounded-2xl border border-stone-200/90 bg-white p-2.5 sm:p-3.5 shadow-lg text-left transition-transform hover:-rotate-2 duration-300">
              <div className="flex items-center gap-1 pb-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-semibold text-stone-600 border border-stone-200/80">
                  <EditPencilIcon /> Before
                </span>
              </div>
              <p className="font-serif italic text-[9.5px] sm:text-[11px] leading-relaxed text-stone-700">
                &ldquo;Dear Registrar, Loan ledger reflects Rs. 4.85 Cr default.
                Precedent Pooja Ramesh Singh cited...&rdquo;
              </p>
              <div className="mt-1.5 rounded-md sm:rounded-lg bg-rose-50 p-1 sm:p-1.5 border border-rose-100 text-[8px] sm:text-[9px] text-rose-700 font-medium truncate">
                ⚠️ Conflicting amount · Unverified
              </div>
            </div>

            {/* Sheet 2: After (Right, tilted 2 deg, sitting forward & responsive) */}
            <div className="absolute right-0 sm:right-2 md:right-4 bottom-20 sm:bottom-24 md:bottom-26 z-20 w-[10.5rem] sm:w-[13rem] md:w-[14.75rem] rotate-2 rounded-xl sm:rounded-2xl border border-stone-200 bg-white p-2.5 sm:p-3.5 shadow-xl text-left transition-transform hover:rotate-0 duration-300">
              <div className="flex items-center justify-between pb-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#ebf4fc] px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-semibold text-[#27537b] border border-[#d2e4f5]">
                  <EditPencilIcon /> After
                </span>
                <span className="text-[8px] sm:text-[9px] font-bold text-emerald-700 flex items-center gap-0.5">
                  ✓ Verified
                </span>
              </div>
              <p className="text-[9px] sm:text-[10px] font-semibold text-stone-900 truncate">
                To the Hon&apos;ble Adjudicating Authority:
              </p>
              <p className="font-serif text-[9.5px] sm:text-[11px] leading-relaxed text-stone-800 pt-0.5 line-clamp-2">
                &ldquo;Corporate Debtor defaulted on ₹5.20 crore as on 14 March
                2025 as per Bank Certificate.&rdquo;
              </p>
              <div className="mt-1.5 flex items-center justify-between border-t border-stone-100 pt-1 text-[8px] sm:text-[9px] text-stone-500">
                <span className="font-mono text-stone-600">2026 INSC 668</span>
                <span className="text-emerald-700 font-semibold bg-emerald-50 px-1 py-0.2 rounded-full border border-emerald-100">
                  Quote Matched
                </span>
              </div>
            </div>

            {/* Envelope Front Pocket (z-30, covers lower half of sheets with iconic V-dip) */}
            <div className="absolute bottom-0 inset-x-0 z-30 h-[80px] sm:h-[100px] md:h-[115px] pointer-events-none">
              <svg
                viewBox="0 0 520 120"
                className="w-full h-full drop-shadow-[0_-4px_16px_rgba(30,50,90,0.08)]"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient
                    id="envFrontGrad"
                    x1="0%"
                    y1="0%"
                    x2="0%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#fafcff" />
                  </linearGradient>
                </defs>
                <path
                  d="M 15 24 L 250 75 Q 260 80, 270 75 L 505 24 L 505 120 L 15 120 Z"
                  fill="url(#envFrontGrad)"
                  stroke="#d4e3f0"
                  strokeWidth="1.5"
                />
                <line
                  x1="15"
                  y1="120"
                  x2="260"
                  y2="78"
                  stroke="#eef4fa"
                  strokeWidth="1.2"
                />
                <line
                  x1="505"
                  y1="120"
                  x2="260"
                  y2="78"
                  stroke="#eef4fa"
                  strokeWidth="1.2"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
