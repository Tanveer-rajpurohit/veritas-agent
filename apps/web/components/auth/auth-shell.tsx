import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { VeritasOrb } from "../brand/veritas-orb";
import { AuthDemo } from "./auth-demo";

const WORKFLOW = ["Upload records", "Draft the brief", "Check citations", "Settle conflicts", "Export draft"];

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-[var(--vh)] min-h-[var(--vh)] overflow-hidden bg-white text-stone-900">
      {/* Left Column: Form & Brand */}
      <div className="flex min-w-0 flex-1 flex-col items-center justify-between gap-8 overflow-y-auto px-6 py-10 sm:px-12 sm:py-14 [&>*]:w-full [&>*]:max-w-[25rem]">
        <Link className="flex shrink-0 items-center gap-2.5 no-underline" href="/" aria-label="Veritas Home">
          <VeritasOrb size={22} className="text-[#487aa8]" />
          <span className="font-display text-2xl font-medium leading-none tracking-tight text-stone-900">
            Veritas
          </span>
        </Link>

        {children}

        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-stone-500">
          <p className="m-0">© {new Date().getFullYear()} Veritas</p>
          <Link className="no-underline hover:text-stone-900 hover:underline" href="/privacy">
            Privacy
          </Link>
          <Link className="no-underline hover:text-stone-900 hover:underline" href="/terms">
            Terms
          </Link>
        </div>
      </div>

      {/* Right Column: Serene Sky Theme Panel with High-Contrast Typography */}
      <div
        className="relative hidden w-[45%] shrink-0 flex-col justify-between gap-6 overflow-hidden bg-[linear-gradient(180deg,#6b97bf_0%,#87aed2_45%,#afd0eb_80%,#d2e5f5_100%)] p-10 lg:p-14 select-none lg:flex"
        aria-hidden="true"
      >
        {/* Ambient atmospheric glow */}
        <div
          className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full opacity-40 blur-3xl"
          style={{
            background: "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(200,225,250,0.4) 60%, transparent 80%)",
          }}
        />

        <div className="relative z-10 flex items-center gap-2 self-start rounded-full border border-white/70 bg-white/30 px-3.5 py-1.5 text-xs font-semibold text-stone-900 shadow-xs backdrop-blur-md">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#1e466a]" />
          Live Evidence Preview
        </div>

        <div className="relative z-10 my-auto">
          <AuthDemo />
        </div>

        {/* High-Contrast Readability Card for Workflow Steps */}
        <div className="relative z-10 flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/85 p-5 shadow-sm backdrop-blur-md">
          <span className="text-[11px] font-bold tracking-wider text-[#1e466a] uppercase font-mono">
            The verification workflow
          </span>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {WORKFLOW.map((step, index) => (
              <Fragment key={step}>
                {index > 0 ? <span className="text-[#487aa8] font-bold">→</span> : null}
                <span className="rounded-full bg-white border border-[#cbe0f2] px-3 py-1 font-semibold text-stone-800 shadow-2xs">
                  {step}
                </span>
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

