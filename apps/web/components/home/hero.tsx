"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";

function DownloadIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export function Hero() {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const envelopeRef = useRef<HTMLDivElement>(null);
  const sheetBeforeRef = useRef<HTMLDivElement>(null);
  const sheetAfterRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!titleRef.current) return;

    const words = titleRef.current.querySelectorAll<HTMLElement>("span.hero-word");
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
      }
    );

    if (envelopeRef.current) {
      gsap.fromTo(
        envelopeRef.current,
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1.05,
          delay: 0.2,
          ease: "power3.out",
          clearProps: "transform,opacity",
        }
      );
    }

    if (sheetBeforeRef.current && sheetAfterRef.current) {
      gsap.set(sheetBeforeRef.current, {
        xPercent: -58,
        x: -4,
        y: 64,
        rotate: -4,
        transformOrigin: "bottom center",
      });
      gsap.set(sheetAfterRef.current, {
        xPercent: -42,
        x: 4,
        y: 58,
        rotate: 3,
        transformOrigin: "bottom center",
      });
    }
  }, []);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (!sheetBeforeRef.current || !sheetAfterRef.current) return;

    gsap.to(sheetBeforeRef.current, {
      xPercent: -58,
      x: -38,
      y: -16,
      rotate: -9,
      scale: 1.02,
      duration: 0.52,
      ease: "power3.out",
      overwrite: "auto",
    });
    gsap.to(sheetAfterRef.current, {
      xPercent: -42,
      x: 38,
      y: -22,
      rotate: 7,
      scale: 1.03,
      duration: 0.52,
      ease: "power3.out",
      overwrite: "auto",
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (!sheetBeforeRef.current || !sheetAfterRef.current) return;

    gsap.to(sheetBeforeRef.current, {
      xPercent: -58,
      x: -4,
      y: 64,
      rotate: -4,
      scale: 1.0,
      duration: 0.45,
      ease: "power3.inOut",
      overwrite: "auto",
    });
    gsap.to(sheetAfterRef.current, {
      xPercent: -42,
      x: 4,
      y: 58,
      rotate: 3,
      scale: 1.0,
      duration: 0.45,
      ease: "power3.inOut",
      overwrite: "auto",
    });
  };

  return (
    <section className="w-full relative overflow-hidden">
      <div className="relative flex min-h-[44rem] w-full flex-col items-center justify-between overflow-hidden bg-[linear-gradient(180deg,#7aa0c6_0%,#96b7d7_45%,#d2e3f0_85%,#ecf3f9_100%)] pt-28 pb-0 text-center sm:min-h-[100dvh] sm:pt-36">
        <div
          className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[550px] w-[900px] rounded-full opacity-45 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(200,225,250,0.3) 60%, transparent 80%)",
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-5 text-center sm:px-6">
          <h1
            ref={titleRef}
            className="m-0 text-center font-sans text-[clamp(2.35rem,6vw,4.75rem)] leading-[1.04] font-bold tracking-[-0.045em] text-white drop-shadow-xs"
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

          <p className="m-0 max-w-md pt-4 pb-7 text-center font-sans text-xs sm:text-base leading-6 sm:leading-7 text-white/90 sm:max-w-xl">
            Turn matter records into a working brief, check each claim against
            its source, and keep every review decision attached to the draft.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
            <Link
              href="/register"
              className="rounded-md bg-[#487aa8] hover:bg-[#3a6792] px-5 sm:px-6 py-2.5 text-xs sm:text-sm font-semibold text-white no-underline shadow-xs transition-all hover:scale-[1.02] active:scale-95 border border-white/20"
            >
              Launch Workspace
            </Link>
            <Link
              href="#download"
              className="inline-flex items-center gap-1.5 rounded-md bg-white hover:bg-slate-50 px-5 sm:px-6 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 no-underline shadow-xs transition-all hover:scale-[1.02] active:scale-95"
            >
              <DownloadIcon />
              <span>Download App</span>
            </Link>
          </div>
        </div>

        <div
          ref={envelopeRef}
          className="relative z-20 mt-10 flex w-full max-w-full flex-col items-center px-4 pt-10 sm:pt-16 select-none sm:mt-auto"
        >
          <div
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={() => (isHovered ? handleMouseLeave() : handleMouseEnter())}
            className="relative w-full max-w-[370px] sm:max-w-[430px] md:max-w-[470px] h-[155px] sm:h-[185px] md:h-[210px] flex items-end justify-center cursor-pointer group"
          >
            <div
              className="pointer-events-none hidden sm:flex absolute -left-3 md:-left-6 bottom-4 md:bottom-5 h-16 md:h-20 w-22 md:w-28 -rotate-12 rounded-md border border-white/70 bg-white/35 p-2 shadow-xs backdrop-blur-xs flex-col justify-center gap-1.5 transition-transform duration-300 group-hover:-translate-x-1"
              aria-hidden="true"
            >
              <div className="h-1.5 w-3/4 rounded-full bg-sky-200/80" />
              <div className="h-1.5 w-1/2 rounded-full bg-sky-200/80" />
              <div className="h-1.5 w-2/3 rounded-full bg-sky-200/80" />
            </div>

            <div
              className="pointer-events-none hidden sm:flex absolute -right-3 md:-right-6 bottom-4 md:bottom-5 h-16 md:h-20 w-22 md:w-28 rotate-12 rounded-md border border-white/70 bg-white/35 p-2 shadow-xs backdrop-blur-xs flex-col justify-center gap-1.5 transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden="true"
            >
              <div className="h-1.5 w-3/4 rounded-full bg-sky-200/80" />
              <div className="h-1.5 w-1/2 rounded-full bg-sky-200/80" />
              <div className="h-1.5 w-2/3 rounded-full bg-sky-200/80" />
            </div>

            <div className="absolute inset-0 z-0 flex items-end pointer-events-none">
              <svg
                viewBox="0 0 540 240"
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
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                    <stop offset="45%" stopColor="#f3f7fb" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#dce8f4" stopOpacity="0.95" />
                  </linearGradient>
                </defs>
                <path
                  d="M 15 130 L 260 14 Q 270 10, 280 14 L 525 130 L 525 240 L 15 240 Z"
                  fill="url(#envBackGrad)"
                  stroke="#c5dbec"
                  strokeWidth="1.5"
                />
              </svg>
            </div>

            <div
              ref={sheetBeforeRef}
              style={{ transform: "translate(-58%, 64px) rotate(-4deg)" }}
              className="absolute left-1/2 bottom-8 sm:bottom-10 md:bottom-12 z-10 w-[145px] sm:w-[175px] md:w-[198px] h-[165px] sm:h-[190px] md:h-[212px] rounded-md border border-stone-200/90 bg-white p-2.5 sm:p-3.5 shadow-[0_8px_24px_rgba(20,40,75,0.08)] text-left will-change-transform"
            >
              <div className="flex justify-center pb-1.5">
                <span className="inline-block rounded-md bg-stone-100 px-2 py-0.5 text-[8px] sm:text-[9px] font-mono font-semibold uppercase tracking-wider text-stone-600 border border-stone-200 shadow-2xs">
                  Unverified Draft
                </span>
              </div>

              <p className="font-sans font-semibold text-[9px] sm:text-[10.5px] text-stone-900 pb-0.5">
                Before NCLT (Court II)
              </p>
              <p className="font-serif italic text-[8.5px] sm:text-[10px] leading-[1.5] text-stone-700">
                &ldquo;Corporate Debtor failed to service loan interest as per Schedule I. Total claimed: ₹4.85 Cr.&rdquo;
              </p>

              <div className="mt-2 pt-1.5 border-t border-stone-100 text-[7.5px] sm:text-[8.5px] font-mono text-rose-600 flex items-center justify-between">
                <span>Schedule I vs Ledger</span>
                <span className="font-semibold bg-rose-50 border border-rose-200/80 px-1 py-0.5 rounded-md">Mismatch</span>
              </div>
            </div>

            <div
              ref={sheetAfterRef}
              style={{ transform: "translate(-42%, 58px) rotate(3deg)" }}
              className="absolute left-1/2 bottom-11 sm:bottom-13 md:bottom-15 z-20 w-[150px] sm:w-[180px] md:w-[204px] h-[175px] sm:h-[200px] md:h-[222px] rounded-md border border-[#cbe0f2] bg-white p-2.5 sm:p-3.5 shadow-[0_12px_28px_rgba(20,40,75,0.12)] text-left will-change-transform"
            >
              <div className="flex justify-center pb-1.5">
                <span className="inline-block rounded-md bg-[#edf5fc] px-2 py-0.5 text-[8px] sm:text-[9px] font-mono font-semibold uppercase tracking-wider text-[#1e466a] border border-[#cbe2f5] shadow-2xs">
                  Veritas Verified
                </span>
              </div>

              <p className="font-sans font-semibold text-[9px] sm:text-[10.5px] text-stone-900 pb-0.5">
                Adjudicating Authority (NCLT)
              </p>
              <p className="font-serif text-[8.5px] sm:text-[10px] leading-[1.5] text-stone-800">
                &ldquo;Corporate Debtor defaulted on ₹5.20 Cr as of 14 March 2025, authenticated by Bank Certificate.&rdquo;
              </p>

              <div className="mt-2 pt-1.5 flex items-center justify-between border-t border-stone-100 text-[7.5px] sm:text-[8.5px] font-mono text-stone-500">
                <span className="font-semibold text-stone-700">2026 INSC 668</span>
                <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/80">
                  ✓ Record Matched
                </span>
              </div>
            </div>

            <div className="absolute bottom-0 inset-x-0 z-30 h-[68px] sm:h-[82px] md:h-[95px] pointer-events-none">
              <svg
                viewBox="0 0 540 120"
                className="w-full h-full drop-shadow-[0_-4px_16px_rgba(20,50,90,0.08)]"
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
                    <stop offset="60%" stopColor="#f8fbfe" />
                    <stop offset="100%" stopColor="#ecf4fa" />
                  </linearGradient>
                </defs>
                <path
                  d="M 15 24 L 260 76 Q 270 80, 280 76 L 525 24 L 525 120 L 15 120 Z"
                  fill="url(#envFrontGrad)"
                  stroke="#cddfe8"
                  strokeWidth="1.5"
                />
                <line
                  x1="15"
                  y1="120"
                  x2="270"
                  y2="78"
                  stroke="#e6eff7"
                  strokeWidth="1.5"
                />
                <line
                  x1="525"
                  y1="120"
                  x2="270"
                  y2="78"
                  stroke="#e6eff7"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
