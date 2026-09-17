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
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#487aa8] text-white shadow-xs">
            <VeritasOrb size={14} className="text-white" />
          </span>
          <span className="font-display text-2xl leading-none tracking-tight text-stone-900 font-normal">
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

      {/* Right Column: Serene Sky Theme Panel matching Hero */}
      <div
        className="relative hidden w-[45%] shrink-0 flex-col justify-between gap-6 overflow-hidden bg-[linear-gradient(180deg,#7aa0c6_0%,#96b7d7_45%,#d2e3f0_85%,#ecf3f9_100%)] p-10 lg:p-14 select-none lg:flex"
        aria-hidden="true"
      >
        {/* Ambient atmospheric glow */}
        <div
          className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full opacity-40 blur-3xl"
          style={{
            background: "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(200,225,250,0.4) 60%, transparent 80%)",
          }}
        />

        <div className="relative z-10 flex items-center gap-2 self-start rounded-full border border-white/50 bg-white/20 px-3 py-1.5 text-xs font-medium text-white shadow-xs backdrop-blur-md">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          Live Evidence Preview
        </div>

        <div className="relative z-10 my-auto">
          <AuthDemo />
        </div>

        <div className="relative z-10 flex flex-col gap-3.5 border-t border-white/30 pt-6">
          <span className="text-[11px] font-semibold tracking-wider text-white/80 uppercase">
            The verification workflow
          </span>
          <div className="flex flex-wrap items-center gap-2 text-xs text-white/95">
            {WORKFLOW.map((step, index) => (
              <Fragment key={step}>
                {index > 0 ? <i className="text-white/50 not-italic">→</i> : null}
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 backdrop-blur-xs">{step}</span>
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
