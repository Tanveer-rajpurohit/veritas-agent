"use client";

import { useState } from "react";

type DemoScenario = "conflict" | "citation" | "stale";

export function BeforeAfter() {
  const [activeTab, setActiveTab] = useState<DemoScenario>("conflict");
  const [edited, setEdited] = useState(false);
  const [chosenAmount, setChosenAmount] = useState<"4.85" | "5.20">("5.20");

  return (
    <div className="w-full">
      <div className="relative mx-auto max-w-5xl rounded-xl border border-white/80 bg-white/95 p-4 sm:p-6 md:p-8 shadow-[0_25px_60px_-15px_rgba(20,40,70,0.15)] backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-stone-200/80 pb-5">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-[#487aa8] animate-pulse" />
            <span className="text-xs font-semibold text-stone-900 tracking-wide uppercase">
              Interactive Evidence Docket
            </span>
            <span className="hidden sm:inline-block text-stone-300">|</span>
            <span className="hidden sm:inline-block text-xs text-stone-500">
              Commercial Litigation Sample
            </span>
          </div>

          <div className="flex items-center rounded-md bg-stone-100 p-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setActiveTab("conflict");
                setEdited(false);
              }}
              className={`rounded-md px-3.5 py-1.5 font-medium transition-all ${
                activeTab === "conflict"
                  ? "bg-white text-stone-900 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Document Discrepancy
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("citation");
                setEdited(false);
              }}
              className={`rounded-md px-3.5 py-1.5 font-medium transition-all ${
                activeTab === "citation"
                  ? "bg-white text-stone-900 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Citation Check
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("stale")}
              className={`rounded-md px-3.5 py-1.5 font-medium transition-all ${
                activeTab === "stale"
                  ? "bg-white text-stone-900 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Auto-Reset on Edit
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col justify-between rounded-lg border border-stone-200 bg-stone-50/70 p-5 sm:p-6 text-left transition-all">
            <div>
              <div className="flex items-center justify-between gap-2 pb-4">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-100 px-3 py-1 text-[11px] font-semibold text-rose-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                  Before Veritas (Standard AI & Unchecked Drafts)
                </span>
                <span className="text-[11px] text-stone-500">
                  Court Risk: High
                </span>
              </div>

              {activeTab === "conflict" && (
                <div className="space-y-3">
                  <div className="rounded-md border border-amber-200/80 bg-amber-50/70 p-3.5">
                    <div className="flex items-center justify-between pb-1.5">
                      <span className="text-[11px] font-semibold text-amber-900">
                        Loan Sanction Letter · Page 14
                      </span>
                      <span className="rounded-md bg-amber-200/60 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                        ₹4.85 Crore
                      </span>
                    </div>
                    <p className="font-serif text-xs leading-relaxed text-stone-700 italic">
                      “Total facility sanctioned across two tranches shall not exceed ₹4,85,00,000/-”
                    </p>
                  </div>

                  <div className="rounded-md border border-rose-200/80 bg-rose-50/70 p-3.5">
                    <div className="flex items-center justify-between pb-1.5">
                      <span className="text-[11px] font-semibold text-rose-900">
                        Bank Demand Notice · Page 1
                      </span>
                      <span className="rounded-md bg-rose-200/60 px-2 py-0.5 text-[10px] font-semibold text-rose-900">
                        ₹5.20 Crore
                      </span>
                    </div>
                    <p className="font-serif text-xs leading-relaxed text-stone-700 italic">
                      “Cumulative default balance of ₹5,20,18,400/- as on 14 March 2025.”
                    </p>
                  </div>

                  <div className="rounded-md border border-dashed border-stone-300 bg-white p-3 text-xs text-stone-600">
                    <span className="font-semibold text-stone-800">
                      Standard AI Flaw:
                    </span>{" "}
                    Picks one number at random without noticing the ₹35 Lakh difference. In court, opposing counsel immediately uses the conflict to challenge your client&apos;s claim.
                  </div>
                </div>
              )}

              {activeTab === "citation" && (
                <div className="space-y-3">
                  <div className="rounded-md border border-rose-200 bg-rose-50/60 p-3.5">
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-[11px] font-semibold text-stone-900">
                        Pooja Ramesh Singh v. J&K Bank Ltd.
                      </span>
                      <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-800">
                        2026 INSC 668
                      </span>
                    </div>
                    <p className="font-serif text-xs leading-relaxed text-stone-700 pt-1 italic">
                      “The Supreme Court held that once a section 7 application is filed, the tribunal cannot grant further cure periods...”
                    </p>
                  </div>

                  <div className="rounded-md border border-rose-200 bg-white p-3 text-xs text-rose-800">
                    <span className="font-semibold">The Dangerous Trap:</span> The case is real, but the quoted sentence was made up by an AI model. In 2026, the Supreme Court quashed insolvency proceedings across India specifically for this type of hallucinated citation.
                  </div>
                </div>
              )}

              {activeTab === "stale" && (
                <div className="space-y-3">
                  <div className="rounded-md border border-stone-200 bg-white p-3.5">
                    <span className="text-[11px] text-stone-500">
                      Yesterday&apos;s Drafted Paragraph
                    </span>
                    <p className="font-serif text-xs leading-relaxed text-stone-800 pt-1">
                      “Default occurred on 14 March 2025 for ₹5.20 Cr.”
                    </p>
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                      ✓ Checked Yesterday
                    </div>
                  </div>

                  <div className="rounded-md border border-stone-200 bg-stone-100/70 p-3 text-xs text-stone-600">
                    <span className="font-semibold text-stone-800">
                      Hidden Problem:
                    </span>{" "}
                    A junior lawyer edits a date or amount. Ordinary software leaves the green checkmark active, giving you false confidence right up to the hearing.
                  </div>
                </div>
              )}
            </div>

            <p className="mt-4 border-t border-stone-200 pt-3 text-[11px] text-stone-500">
              Without linked proof, drafting errors turn into costly courtroom surprises.
            </p>
          </div>

          <div className="flex flex-col justify-between rounded-lg border border-[#bed7ec] bg-[#f8fbfe] p-5 sm:p-6 text-left shadow-xs transition-all">
            <div>
              <div className="flex items-center justify-between gap-2 pb-4">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-[#e3eef8] px-3 py-1 text-[11px] font-semibold text-[#3d6991]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#487aa8]" />
                  With Veritas (Evidence Beside You)
                </span>
                <span className="text-[11px] text-[#3d6991] font-semibold">
                  Verified Ground Truth
                </span>
              </div>

              {activeTab === "conflict" && (
                <div className="space-y-3">
                  <div className="rounded-md border-l-4 border-l-[#487aa8] border border-stone-200 bg-white p-3.5 shadow-xs">
                    <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide">
                      Draft Brief Paragraph
                    </span>
                    <p className="font-serif text-[13px] leading-relaxed text-stone-900 pt-1">
                      “The Corporate Debtor committed a default of{" "}
                      <mark className="bg-[#e8f1f9] text-[#2c5478] font-semibold px-1.5 py-0.5 rounded">
                        ₹{chosenAmount} crore
                      </mark>{" "}
                      as payable under the facility on 14 March 2025.”
                    </p>
                  </div>

                  <div className="rounded-md border border-[#d2e4f2] bg-white p-3.5 shadow-xs">
                    <div className="flex items-center justify-between pb-2">
                      <span className="text-[11px] font-semibold text-[#2c5478]">
                        Evidence Drawer: Conflicting Records Found
                      </span>
                      <span className="rounded-md bg-[#eaf3fa] px-2 py-0.5 text-[10px] font-semibold text-[#3d6991]">
                        You Decide
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setChosenAmount("4.85")}
                        className={`rounded-md p-2.5 text-left border transition-all ${
                          chosenAmount === "4.85"
                            ? "border-[#487aa8] bg-[#f0f6fb] shadow-xs font-semibold text-stone-900"
                            : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                        }`}
                      >
                        <p className="text-[10px] text-stone-400">
                          Sanction Letter (p.14)
                        </p>
                        <p className="text-stone-900 pt-0.5">₹4.85 Cr limit</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setChosenAmount("5.20")}
                        className={`rounded-md p-2.5 text-left border transition-all ${
                          chosenAmount === "5.20"
                            ? "border-[#487aa8] bg-[#f0f6fb] shadow-xs font-semibold text-[#2c5478]"
                            : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                        }`}
                      >
                        <p className="text-[10px] text-[#487aa8]">
                          Demand Notice (p.1)
                        </p>
                        <p className="text-[#2c5478] pt-0.5">₹5.20 Cr default ✓</p>
                      </button>
                    </div>

                    <p className="mt-2.5 text-[11px] text-stone-600">
                      Reason recorded: Bank demand notice includes default interest accrued after the sanction letter.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "citation" && (
                <div className="space-y-2.5">
                  <div className="rounded-md border-l-4 border-l-[#487aa8] border border-stone-200 bg-white p-3 shadow-xs">
                    <span className="text-[10px] text-stone-400 uppercase tracking-wide">
                      Cited Authority
                    </span>
                    <p className="font-serif text-xs text-stone-900 pt-0.5 font-medium">
                      Pooja Ramesh Singh v. J&K Bank Ltd., 2026 INSC 668
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md border border-emerald-200 bg-emerald-50/60 p-2.5">
                      <span className="text-[10px] text-emerald-700 uppercase font-semibold">
                        1. Case Exists
                      </span>
                      <p className="font-semibold text-emerald-900 pt-0.5">
                        ✓ In Official Records
                      </p>
                    </div>

                    <div className="rounded-md border border-rose-200 bg-rose-50/60 p-2.5">
                      <span className="text-[10px] text-rose-700 uppercase font-semibold">
                        2. Exact Quote
                      </span>
                      <p className="font-semibold text-rose-900 pt-0.5">
                        ✕ Words Altered
                      </p>
                    </div>

                    <div className="rounded-md border border-amber-200 bg-amber-50/60 p-2.5">
                      <span className="text-[10px] text-amber-700 uppercase font-semibold">
                        3. Legal Support
                      </span>
                      <p className="font-semibold text-amber-900 pt-0.5">
                        ⚠ Check Holding
                      </p>
                    </div>

                    <div className="rounded-md border border-emerald-200 bg-emerald-50/60 p-2.5">
                      <span className="text-[10px] text-emerald-700 uppercase font-semibold">
                        4. Still Good Law
                      </span>
                      <p className="font-semibold text-emerald-900 pt-0.5">
                        ✓ Unreversed
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-stone-600 bg-white p-2.5 rounded-md border border-stone-200">
                    The quote mismatch is flagged in red so you can correct it before exporting.
                  </p>
                </div>
              )}

              {activeTab === "stale" && (
                <div className="space-y-3">
                  <div className="rounded-md border border-stone-200 bg-white p-3.5 shadow-xs">
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-[10px] text-stone-400 uppercase tracking-wide">
                        Try modifying this sentence:
                      </span>
                      <button
                        type="button"
                        onClick={() => setEdited(!edited)}
                        className="rounded-md bg-[#487aa8] hover:bg-[#3d6991] px-3 py-1 text-[11px] font-medium text-white transition-all"
                      >
                        {edited ? "Revert edit" : "Edit sentence"}
                      </button>
                    </div>

                    <p className="font-serif text-xs leading-relaxed text-stone-900 pt-1">
                      “Default of{" "}
                      <span
                        className={
                          edited
                            ? "bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold"
                            : "underline"
                        }
                      >
                        {edited ? "₹5.45 crore" : "₹5.20 crore"}
                      </span>{" "}
                      under the credit facility as on 14 March 2025.”
                    </p>
                  </div>

                  <div
                    className={`rounded-md border p-3.5 transition-all ${
                      edited
                        ? "border-amber-300 bg-amber-50/80"
                        : "border-emerald-200 bg-emerald-50/60"
                    }`}
                  >
                    <div className="flex items-center justify-between pb-1">
                      <span
                        className={`text-xs font-bold ${
                          edited ? "text-amber-900" : "text-emerald-900"
                        }`}
                      >
                        {edited
                          ? "Status: RESET TO STALE"
                          : "Status: VERIFIED AGAINST RECORD"}
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                          edited
                            ? "bg-amber-200 text-amber-900"
                            : "bg-emerald-200 text-emerald-900"
                        }`}
                      >
                        {edited ? "Re-verification Needed" : "Page 1 Match"}
                      </span>
                    </div>

                    <p className="text-xs text-stone-700 pt-0.5">
                      {edited
                        ? "You changed the amount. Old approvals are automatically wiped out until you re-run the check."
                        : "Sentence matches the bank demand notice on page 1 word-for-word."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <p className="mt-4 border-t border-[#d2e4f2] pt-3 text-[11px] text-[#3d6991]">
              ✓ Every verification mark is linked to the exact sentence text. It can never be faked or carried over after an edit.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
