"use client";

import { useState } from "react";
import { Reveal } from "./motion";

export function DraftReviewCards() {
  const [selectedAxis, setSelectedAxis] = useState<
    "identity" | "quotation" | "support" | "treatment"
  >("quotation");
  const [conflictResolved, setConflictResolved] = useState(false);

  return (
    <section
      id="evidence"
      className="w-full border-b border-stone-200 bg-white"
    >
      <div className="w-full max-w-6xl lg:max-w-7xl mx-auto border-x border-stone-200 px-6 sm:px-10 lg:px-12 py-16 sm:py-24">
        {/* Two Crisp Bento Cards */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* BENTO CARD 1: 4-Axis Citation Audit */}
          <Reveal className="flex min-h-[30rem] flex-col justify-between rounded-2xl sm:rounded-3xl border border-stone-200/90 bg-white p-7 sm:p-9 shadow-xs hover:border-stone-300 hover:shadow-md transition-all">
            <div>
              <div className="flex items-center justify-between pb-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#487aa8]" />
                  4-Axis Citation Check
                </span>
                <span className="text-xs font-mono text-stone-500 font-medium">
                  2026 INSC 668
                </span>
              </div>

              <h3 className="m-0 pt-2 pb-2 text-2xl font-bold tracking-tight text-stone-900">
                Pooja Ramesh Singh v. J&amp;K Bank Ltd.
              </h3>

              <p className="text-xs font-mono text-stone-500 pb-3">
                Supreme Court of India · Landmark Precedent
              </p>

              <p className="text-sm text-stone-600 pb-5 leading-relaxed">
                In July 2026, the Supreme Court quashed insolvency orders
                because AI generated fictional paragraphs under this real case
                name. Veritas tests all four dimensions independently:
              </p>

              {/* Interactive Axis Selector */}
              <div className="grid grid-cols-2 gap-2.5 text-xs mb-4">
                <button
                  type="button"
                  onClick={() => setSelectedAxis("identity")}
                  className={`rounded-xl p-3 text-left border transition-all cursor-pointer ${
                    selectedAxis === "identity"
                      ? "border-stone-900 bg-stone-900 text-white shadow-xs"
                      : "border-stone-200 bg-stone-50/70 hover:bg-stone-100 text-stone-700"
                  }`}
                >
                  <p
                    className={`text-[10px] font-semibold uppercase ${
                      selectedAxis === "identity"
                        ? "text-stone-300"
                        : "text-stone-400"
                    }`}
                  >
                    1. Case Identity
                  </p>
                  <p className="font-semibold pt-0.5">✓ Official SC Record</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedAxis("quotation")}
                  className={`rounded-xl p-3 text-left border transition-all cursor-pointer ${
                    selectedAxis === "quotation"
                      ? "border-rose-900 bg-rose-950 text-white shadow-xs"
                      : "border-stone-200 bg-stone-50/70 hover:bg-stone-100 text-stone-700"
                  }`}
                >
                  <p
                    className={`text-[10px] font-semibold uppercase ${
                      selectedAxis === "quotation"
                        ? "text-rose-300"
                        : "text-stone-400"
                    }`}
                  >
                    2. Verbatim Quote
                  </p>
                  <p className="font-semibold pt-0.5">✕ Mismatch Flagged</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedAxis("support")}
                  className={`rounded-xl p-3 text-left border transition-all cursor-pointer ${
                    selectedAxis === "support"
                      ? "border-amber-900 bg-amber-950 text-white shadow-xs"
                      : "border-stone-200 bg-stone-50/70 hover:bg-stone-100 text-stone-700"
                  }`}
                >
                  <p
                    className={`text-[10px] font-semibold uppercase ${
                      selectedAxis === "support"
                        ? "text-amber-300"
                        : "text-stone-400"
                    }`}
                  >
                    3. Ratio Support
                  </p>
                  <p className="font-semibold pt-0.5">⚠ Counsel Review</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedAxis("treatment")}
                  className={`rounded-xl p-3 text-left border transition-all cursor-pointer ${
                    selectedAxis === "treatment"
                      ? "border-emerald-900 bg-emerald-950 text-white shadow-xs"
                      : "border-stone-200 bg-stone-50/70 hover:bg-stone-100 text-stone-700"
                  }`}
                >
                  <p
                    className={`text-[10px] font-semibold uppercase ${
                      selectedAxis === "treatment"
                        ? "text-emerald-300"
                        : "text-stone-400"
                    }`}
                  >
                    4. Still Good Law
                  </p>
                  <p className="font-semibold pt-0.5">✓ Unreversed</p>
                </button>
              </div>

              {/* Dynamic Axis Explanation */}
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-xs">
                {selectedAxis === "identity" && (
                  <p className="text-stone-800 leading-relaxed">
                    <strong className="text-stone-900">Case Identity:</strong>{" "}
                    Matches cause title, neutral citation (2026 INSC 668),
                    bench, and year against official Supreme Court records.
                  </p>
                )}
                {selectedAxis === "quotation" && (
                  <p className="text-rose-900 leading-relaxed">
                    <strong className="text-rose-950">
                      Verbatim Quotation Mismatch:
                    </strong>{" "}
                    Compares the quoted sentence against authentic judgment text
                    word-for-word. Flags altered or hallucinated paragraphs.
                  </p>
                )}
                {selectedAxis === "support" && (
                  <p className="text-amber-900 leading-relaxed">
                    <strong className="text-amber-950">Legal Support:</strong>{" "}
                    Evaluates whether the judicial ratio actually supports your
                    asserted proposition. Explicitly flagged for advocate
                    review.
                  </p>
                )}
                {selectedAxis === "treatment" && (
                  <p className="text-stone-800 leading-relaxed">
                    <strong className="text-stone-900">
                      Current Standing:
                    </strong>{" "}
                    Confirms whether subsequent High Court or Supreme Court
                    benches have overturned or distinguished the ruling.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 border-t border-stone-100 pt-4 flex items-center justify-between text-xs text-stone-500">
              <span>Deterministic Court Text</span>
              <span className="font-semibold text-stone-900">
                Zero Hallucinated Precedents
              </span>
            </div>
          </Reveal>

          {/* BENTO CARD 2: Interactive Factual Discrepancy Resolver */}
          <Reveal
            delay={0.08}
            className="flex min-h-[30rem] flex-col justify-between rounded-2xl sm:rounded-3xl border border-stone-200/90 bg-white p-7 sm:p-9 shadow-xs hover:border-stone-300 hover:shadow-md transition-all"
          >
            <div>
              <div className="flex items-center justify-between pb-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                  Document Discrepancy Engine
                </span>
                <span className="text-xs font-medium text-stone-500">
                  Client Intake Records
                </span>
              </div>

              <h3 className="m-0 pt-2 pb-2 text-2xl font-bold tracking-tight text-stone-900">
                Loan Agreement vs. Default Certificate
              </h3>

              <p className="text-xs font-mono text-stone-500 pb-3">
                Commercial Insolvency · Section 7 IBC
              </p>

              <p className="text-sm text-stone-600 pb-5 leading-relaxed">
                When client files contain conflicting default figures, Veritas
                displays both records side by side so the advocate chooses the
                legally correct position:
              </p>

              {/* Side-by-Side Documents */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50/60 p-3.5 shadow-2xs">
                  <div>
                    <p className="text-[11px] font-semibold text-stone-500">
                      Record A: Loan Sanction Agreement (p. 14)
                    </p>
                    <p className="font-serif text-sm text-stone-800 italic pt-0.5">
                      &ldquo;Sanctioned credit limit of ₹4.85 Crore...&rdquo;
                    </p>
                  </div>
                  <span className="rounded-full bg-stone-200/70 px-2.5 py-1 text-xs font-semibold text-stone-700">
                    ₹4.85 Cr
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-stone-300 bg-stone-100/70 p-3.5 shadow-2xs">
                  <div>
                    <p className="text-[11px] font-semibold text-stone-900">
                      Record B: Bank Default Certificate (p. 1)
                    </p>
                    <p className="font-serif text-sm text-stone-900 italic pt-0.5">
                      &ldquo;Cumulative default of ₹5.20 Crore as on 14
                      Mar...&rdquo;
                    </p>
                  </div>
                  <span className="rounded-full bg-stone-900 px-2.5 py-1 text-xs font-bold text-white">
                    ₹5.20 Cr
                  </span>
                </div>
              </div>

              {/* Interactive Resolution Panel */}
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                <div className="flex items-center justify-between pb-2">
                  <span className="text-xs font-semibold text-stone-900">
                    Advocate Decision:
                  </span>
                  <button
                    type="button"
                    onClick={() => setConflictResolved(!conflictResolved)}
                    className="rounded-full bg-stone-900 hover:bg-black px-3.5 py-1.5 text-xs font-medium text-white transition-all shadow-xs cursor-pointer"
                  >
                    {conflictResolved
                      ? "Revert Selection"
                      : "Resolve with Certificate"}
                  </button>
                </div>

                <p className="text-xs text-stone-600 leading-relaxed">
                  {conflictResolved ? (
                    <span className="text-emerald-800 font-medium">
                      ✓ Resolved: Accepted ₹5.20 Cr. Reason recorded:
                      &quot;Certificate reflects accrued default interest
                      post-sanction.&quot; Logged in version history.
                    </span>
                  ) : (
                    <span>
                      Select the bank certificate figure and record the
                      rationale directly into the immutable audit trail.
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="mt-6 border-t border-stone-100 pt-4 flex items-center justify-between text-xs text-stone-500">
              <span>Primary Client Proof</span>
              <span className="font-semibold text-stone-900">
                Immutable Audit Trail
              </span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
