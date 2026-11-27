import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { VeritasOrb } from "../brand/veritas-orb";
import { AuthDemo } from "./auth-demo";

const WORKFLOW = ["Upload records", "Draft", "Check facts", "Review citations", "Export"];

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-[var(--vh)] min-h-[var(--vh)] overflow-hidden bg-white text-stone-900">
      <div className="flex min-w-0 flex-1 flex-col items-center justify-between gap-6 overflow-y-auto px-6 py-8 sm:px-12 sm:py-10 [&>*]:w-full [&>*]:max-w-[25rem]">
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

      <div
        className="relative hidden w-[45%] shrink-0 flex-col justify-between gap-6 overflow-hidden bg-[linear-gradient(180deg,#6b97bf_0%,#87aed2_45%,#afd0eb_80%,#d2e5f5_100%)] p-10 lg:p-14 select-none lg:flex"
        aria-hidden="true"
      >
        <div
          className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full opacity-40 blur-3xl"
          style={{
            background: "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(200,225,250,0.4) 60%, transparent 80%)",
          }}
        />

        <div className="relative z-10 flex flex-col gap-1.5">
          <span className="font-mono text-[10.5px] font-semibold tracking-widest text-sky-100 uppercase">
            Evidence-linked drafting
          </span>
          <h2 className="font-display text-2xl lg:text-[26px] font-normal leading-snug tracking-tight text-white m-0">
            Move from client records to a reviewed working draft
          </h2>
          <p className="text-xs text-sky-50/90 m-0 leading-relaxed max-w-sm">
            See the source behind each material claim, then decide what belongs in the next version.
          </p>
        </div>

        <div className="relative z-10 my-auto">
          <AuthDemo />
        </div>

        <div className="relative z-10 flex flex-col gap-3 rounded-lg border border-white/80 bg-white/85 p-5 shadow-sm backdrop-blur-md">
          <span className="text-[11px] font-bold tracking-wider text-[#1e466a] uppercase font-mono">
            The verification workflow
          </span>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {WORKFLOW.map((step, index) => (
              <Fragment key={step}>
                {index > 0 ? <span className="text-[#487aa8] font-bold">→</span> : null}
                <span className="rounded-md bg-white border border-[#cbe0f2] px-2.5 py-1 font-semibold text-stone-800 shadow-2xs">
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
