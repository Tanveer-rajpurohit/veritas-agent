"use client";

import { useEffect, useRef, useState } from "react";

const SCRIPT = [
  {
    question: "Which default amount stands in the record?",
    answer: {
      title: "Two records disagree",
      rows: [
        { text: "₹4.85 Cr · Loan ledger (p.14)", tone: "bg-amber-100 text-amber-900", chip: "Ledger" },
        { text: "₹5.20 Cr · Bank demand (p.1)", tone: "bg-[#dceaf6] text-[#2c5478]", chip: "Demand" },
      ],
      foot: "Needs advocate review before filing",
    },
  },
  {
    question: "Show the bank demand excerpt.",
    answer: {
      title: "Bank demand certificate · Page 1",
      rows: [{ text: "“Total outstanding balance of ₹5.20 crore remains unpaid…”", tone: "bg-[#dceaf6] text-[#2c5478]", chip: "Supports" }],
      foot: "Verbatim court record, page-anchored",
    },
  },
];

export function AuthDemo() {
  const [typed, setTyped] = useState("");
  const [shown, setShown] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const timer = window.setTimeout(() => {
        setTyped(SCRIPT[0]?.question ?? "");
        setShown(SCRIPT.length);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
    const playTurn = (index: number) => {
      const step = SCRIPT[index % SCRIPT.length];
      if (!step) return;
      setShown(index);
      setTyped("");
      const full = step.question;
      for (let i = 1; i <= full.length; i++) later(() => setTyped(full.slice(0, i)), i * 34);
      later(() => setShown(index + 1), full.length * 34 + 500);
      later(() => playTurn(index + 1), full.length * 34 + 3400);
    };
    playTurn(0);
    const pending = timers.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center gap-3.5">
      {SCRIPT.slice(0, shown).map((step, index) => (
        <div
          key={step.question}
          className={`flex flex-col gap-2 rounded-lg border border-white/80 bg-white/95 p-4 text-left shadow-lg backdrop-blur-md ${index < shown - 1 ? "opacity-75" : ""}`}
        >
          <p className="m-0 text-xs font-semibold text-stone-600">{step.answer.title}</p>
          {step.answer.rows.map((row) => (
            <div key={row.text} className="flex items-center justify-between gap-2 rounded-md bg-stone-50 px-3 py-2 border border-stone-100">
              <span className="text-xs text-stone-800">{row.text}</span>
              <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ${row.tone}`}>{row.chip}</span>
            </div>
          ))}
          <p className="m-0 text-[11px] text-stone-500">{step.answer.foot}</p>
        </div>
      ))}
      <div className="flex items-center justify-between gap-3 rounded-lg border border-white/80 bg-white/95 py-2.5 pr-2 pl-4 shadow-lg backdrop-blur-md">
        <p className="m-0 min-h-5 flex-1 text-left text-xs sm:text-[13px] text-stone-800">
          {typed}
          <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-[#487aa8] align-middle" aria-hidden="true" />
        </p>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#487aa8] text-white shadow-xs" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 19V5M6 11l6-6 6 6" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </div>
  );
}
