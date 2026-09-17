import Link from "next/link";
import { VeritasOrb } from "../brand/veritas-orb";

export function Closing() {
  return (
    <footer className="border-t border-stone-200 bg-white">
      <div className="mx-auto grid w-full max-w-6xl lg:max-w-7xl gap-10 px-6 sm:px-10 lg:px-12 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <VeritasOrb size={20} className="text-[#487aa8]" />
            <span className="font-display text-xl font-normal tracking-tight text-stone-900">
              Veritas
            </span>
          </Link>
          <p className="m-0 max-w-xs pt-4 text-sm leading-relaxed text-stone-600">
            Draft with the evidence beside you. Evidence-linked legal drafting and verification workspace for Indian litigation.
          </p>
        </div>
        <nav aria-label="Product">
          <p className="m-0 pb-3 text-xs font-semibold tracking-wider text-stone-400 uppercase">Product</p>
          <div className="flex flex-col gap-2.5">
            <Link className="text-sm text-stone-600 no-underline hover:text-[#487aa8]" href="#overview">Overview</Link>
            <Link className="text-sm text-stone-600 no-underline hover:text-[#487aa8]" href="#evidence">Evidence Docket</Link>
            <Link className="text-sm text-stone-600 no-underline hover:text-[#487aa8]" href="#workflow">Workflow</Link>
            <Link className="text-sm text-stone-600 no-underline hover:text-[#487aa8]" href="#plans">Pricing</Link>
          </div>
        </nav>
        <nav aria-label="Workspace">
          <p className="m-0 pb-3 text-xs font-semibold tracking-wider text-stone-400 uppercase">Workspace</p>
          <div className="flex flex-col gap-2.5">
            <Link className="text-sm text-stone-600 no-underline hover:text-[#487aa8]" href="/login">Log in</Link>
            <Link className="text-sm text-stone-600 no-underline hover:text-[#487aa8]" href="/register">Sign up</Link>
          </div>
        </nav>
        <nav aria-label="Trust & Legal">
          <p className="m-0 pb-3 text-xs font-semibold tracking-wider text-stone-400 uppercase">Trust & Legal</p>
          <div className="flex flex-col gap-2.5">
            <Link className="text-sm text-stone-600 no-underline hover:text-[#487aa8]" href="/privacy">Privacy Policy</Link>
            <Link className="text-sm text-stone-600 no-underline hover:text-[#487aa8]" href="/terms">Terms of Service</Link>
          </div>
        </nav>
      </div>
      <div className="border-t border-stone-100 bg-stone-50/60">
        <p className="mx-auto w-full max-w-6xl lg:max-w-7xl px-6 sm:px-10 lg:px-12 py-5 text-xs leading-relaxed text-stone-500">
          © {new Date().getFullYear()} Veritas · Evidence-linked drafting workspace for Indian litigation. A draft still requires professional review by an advocate before filing.
        </p>
      </div>
    </footer>
  );
}
