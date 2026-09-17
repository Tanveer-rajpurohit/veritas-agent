"use client";

import Link from "next/link";
import { useState } from "react";
import { Reveal } from "./motion";

export function Plans() {
  const [billing, setBilling] = useState<"annual" | "monthly">("annual");

  return (
    <section id="plans" className="w-full border-b border-stone-200 bg-white scroll-mt-20">
      <div className="w-full max-w-6xl lg:max-w-7xl mx-auto border-x border-stone-200 px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="relative overflow-hidden rounded-lg bg-[linear-gradient(180deg,#7aa0c6_0%,#96b7d7_45%,#d2e3f0_85%,#ecf3f9_100%)] px-5 py-14 sm:px-10 md:px-12 sm:py-18 shadow-[0_20px_60px_-15px_rgba(25,45,75,0.15)]">
          <div
            className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[450px] w-[650px] rounded-full opacity-40 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(200,225,250,0.3) 60%, transparent 80%)",
            }}
            aria-hidden="true"
          />

          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <h2 className="m-0 font-display text-4xl sm:text-5xl font-normal tracking-tight text-white drop-shadow-sm">
              Simple, honest pricing
            </h2>
            <p className="pt-3 pb-8 text-base sm:text-lg text-white/95">
              Transparent plans for advocates, legal teams, and law practices across India.
            </p>

            <div className="inline-flex items-center rounded-md bg-white/90 p-1 text-xs shadow-md backdrop-blur-md mb-12">
              <button
                type="button"
                onClick={() => setBilling("annual")}
                className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 font-medium transition-all ${
                  billing === "annual"
                    ? "bg-[#487aa8] text-white shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <span>Annual</span>
                <span className="rounded-md bg-[#dbe8f4] px-1.5 py-0.5 text-[10px] font-bold text-[#2c5478]">
                  Save 15%
                </span>
              </button>
              <button
                type="button"
                onClick={() => setBilling("monthly")}
                className={`rounded-md px-3.5 py-1.5 font-medium transition-all ${
                  billing === "monthly"
                    ? "bg-[#487aa8] text-white shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Monthly
              </button>
            </div>
          </div>

          <div className="relative z-10 grid gap-6 md:grid-cols-3 items-stretch">
            <Reveal className="flex flex-col justify-between rounded-lg bg-white p-7 text-left shadow-lg">
              <div>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Solo Advocate
                </p>
                <div className="pt-2 pb-1 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-normal text-stone-900">
                    Free
                  </span>
                </div>
                <p className="text-xs text-stone-500 pb-6">
                  For solo advocates drafting and testing their first matter brief.
                </p>

                <ul className="space-y-3 text-xs text-stone-700 pb-8 border-t border-stone-100 pt-5">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> 1 active matter workspace
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> 4-axis legal citation checking
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> Document discrepancy comparison
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> Draft PDF export with notes
                  </li>
                </ul>
              </div>

              <Link
                href="/register"
                className="w-full rounded-md bg-stone-100 py-2.5 text-center text-xs font-semibold text-stone-900 transition-all hover:bg-stone-200"
              >
                Start for Free
              </Link>
            </Reveal>

            <Reveal
              delay={0.06}
              className="flex flex-col justify-between rounded-lg bg-white p-7 text-left shadow-2xl ring-2 ring-[#487aa8]/30 scale-100 md:-translate-y-2 relative"
            >
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-md bg-[#487aa8] px-3.5 py-1 text-[10px] font-bold text-white shadow-sm uppercase tracking-wider">
                Most Popular
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#2c5478] uppercase tracking-wide">
                    Active Practice
                  </p>
                  <span className="rounded-md bg-[#eaf3fa] px-2 py-0.5 text-[10px] font-bold text-[#3d6991]">
                    Save ₹700/yr
                  </span>
                </div>

                <div className="pt-2 pb-1 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-normal text-stone-900">
                    ₹{billing === "annual" ? "349" : "399"}
                  </span>
                  <span className="text-xs text-stone-500 font-medium">/month</span>
                </div>

                <p className="text-xs text-stone-500 pb-6">
                  For practicing advocates handling active court litigation matters.
                </p>

                <ul className="space-y-3 text-xs text-stone-700 pb-8 border-t border-stone-100 pt-5">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> Unlimited active matters & drafts
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> Real-time citation & fact checking
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> Side-by-side record conflict resolver
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> Auto-reset on edit & version history
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> Formatted PDF & JSON exports
                  </li>
                </ul>
              </div>

              <div>
                <Link
                  href="/register"
                  className="block w-full rounded-md bg-[#487aa8] hover:bg-[#3d6991] py-2.5 text-center text-xs font-semibold text-white shadow-md transition-all hover:scale-[1.02] active:scale-95"
                >
                  Start 14-Day Free Trial
                </Link>
                <p className="pt-2 text-center text-[10px] text-stone-400">
                  No credit card required
                </p>
              </div>
            </Reveal>

            <Reveal
              delay={0.12}
              className="flex flex-col justify-between rounded-lg bg-white p-7 text-left shadow-lg"
            >
              <div>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Law Firm & Senior Counsel
                </p>

                <div className="pt-2 pb-1 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-normal text-stone-900">
                    ₹{billing === "annual" ? "799" : "899"}
                  </span>
                  <span className="text-xs text-stone-500 font-medium">/month</span>
                </div>

                <p className="text-xs text-stone-500 pb-6">
                  For litigation teams requiring team collaboration and audit trails.
                </p>

                <ul className="space-y-3 text-xs text-stone-700 pb-8 border-t border-stone-100 pt-5">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> Everything in Active Practice
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> Multi-associate practice workspace
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> Senior counsel sign-off approvals
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> Custom court citation repositories
                  </li>
                </ul>
              </div>

              <Link
                href="/register"
                className="w-full rounded-md bg-stone-100 py-2.5 text-center text-xs font-semibold text-stone-900 transition-all hover:bg-stone-200"
              >
                Get Started
              </Link>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
