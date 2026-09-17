"use client";

import { useState } from "react";

type Tab = "draft" | "review";

const TABS: { id: Tab; label: string }[] = [
  { id: "draft", label: "Draft" },
  { id: "review", label: "Review" },
];

export function HowItWorks() {
  const [tab, setTab] = useState<Tab>("draft");

  return (
    <div className="flex flex-col items-center">
      <h2 className="m-0 pb-8 text-center text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        How Veritas works
      </h2>
      <div className="mb-8 inline-flex items-center gap-1 rounded-md border border-border bg-white p-1" role="tablist" aria-label="How Veritas works">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`rounded-md px-5 py-1.5 text-[13px] font-medium transition-all ${
              tab === item.id ? "bg-foreground text-white shadow-sm" : "text-ink-muted hover:text-ink"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="w-full overflow-hidden rounded-lg bg-[linear-gradient(180deg,var(--hero-from),var(--hero-mid)_55%,var(--hero-to))] px-6 py-12 sm:px-12">
        {tab === "draft" ? (
          <div className="mx-auto flex max-w-xl flex-col items-center text-center" role="tabpanel">
            <p className="m-0 pb-2 text-sm font-semibold text-white/85">Getting started with a brief</p>
            <h3 className="m-0 pb-6 font-display text-3xl font-normal text-white sm:text-4xl">From upload to working brief</h3>
            <div className="w-full rounded-lg bg-white/95 p-5 text-left shadow-xl">
              <div className="flex items-center gap-2 pb-3">
                <span className="rounded-md bg-muted px-2 py-1 font-mono text-[11px] text-ink">loan-ledger.pdf</span>
                <span className="rounded-md bg-muted px-2 py-1 font-mono text-[11px] text-ink">bank-cert.pdf</span>
                <span className="ml-auto rounded-md bg-ok-wash px-2 py-0.5 text-[10px] font-semibold text-ok-ink">Ready</span>
              </div>
              <div className="flex flex-col gap-1.5" aria-hidden="true">
                <span className="h-2 w-3/4 rounded-full bg-border" />
                <span className="h-2 w-full rounded-full bg-border" />
                <span className="h-2 w-full rounded-full bg-border" />
                <span className="h-2 w-1/2 rounded-full bg-border" />
              </div>
              <p className="m-0 pt-3 text-xs text-ink-muted">12 claims extracted · 9 linked to page passages</p>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-xl flex-col items-center text-center" role="tabpanel">
            <p className="m-0 pb-2 text-sm font-semibold text-white/85">Checking every line</p>
            <h3 className="m-0 pb-6 font-display text-3xl font-normal text-white sm:text-4xl">From sentence to evidence</h3>
            <div className="flex w-full flex-col gap-2 text-left">
              {[
                { text: "Identity of 2026 INSC 668 confirmed in official records", tone: "bg-ok-wash text-ok-ink", chip: "Supported" },
                { text: "Quoted words differ from the authentic paragraph", tone: "bg-bad-wash text-bad-ink", chip: "Mismatch" },
                { text: "Ledger and certificate disagree on the default amount", tone: "bg-warn-wash text-warn-ink", chip: "Conflict" },
              ].map((row) => (
                <div key={row.text} className="flex items-center justify-between gap-3 rounded-md bg-white/95 px-4 py-3 shadow">
                  <p className="m-0 text-[13px] text-ink">{row.text}</p>
                  <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ${row.tone}`}>{row.chip}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
