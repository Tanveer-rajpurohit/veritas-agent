import type { Metadata } from "next";
import Link from "next/link";
import { AgentAvatar } from "../components/agent/agent-avatar";
import { SiteNav } from "../components/home/site-nav";
import { BlobLoading } from "../components/ui/blob-loading";

export const metadata: Metadata = {
  title: { absolute: "Veritas | Evidence-linked legal drafting" },
  description: "Draft Indian legal documents, check factual claims, and review citations against their sources in one workspace.",
  alternates: { canonical: "/" },
};

const steps = [
  ["01", "Bring the record", "Create a Matter and upload the agreements, notices, statements, and orders the draft must follow."],
  ["02", "Draft with evidence", "Veritas retrieves the relevant passages and legal text before the Writer proposes document content."],
  ["03", "Run independent checks", "Fact and Citation Reviewers test the saved version. They do not grade their own draft."],
  ["04", "Decide and export", "Inspect the exact source, accept or reject changes, and export with unresolved work still visible."],
] as const;

const dimensions = [
  ["Identity", "Does the authority exist?"],
  ["Quotation", "Do the quoted words match?"],
  ["Support", "Does it support this proposition?"],
  ["Treatment", "Is later legal treatment resolved?"],
] as const;

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#fbfcfd] text-[#17212b] selection:bg-[#487aa8] selection:text-white">
      <SiteNav />
      <main className="overflow-hidden">
        <section className="relative border-b border-[#dce7f0] pt-28" id="overview">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(72,122,168,.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(72,122,168,.08)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_86%)]" />
          <div className="relative mx-auto grid max-w-[1180px] gap-12 px-5 pb-20 pt-10 lg:grid-cols-[1.05fr_.95fr] lg:items-end lg:px-8 lg:pb-28">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#cbe0f2] bg-white px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[.16em] text-[#38648c] shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[#d8895b]" />
                Evidence-linked legal work
              </div>
              <h1 className="m-0 max-w-3xl font-display text-[clamp(3.4rem,7vw,6.8rem)] font-medium leading-[.91] tracking-[-.055em] text-[#153b5a]">
                A legal draft should show its work.
              </h1>
              <p className="mt-8 max-w-xl text-base leading-7 text-[#52697c] sm:text-lg">
                Veritas turns Matter records into an editable draft, then checks its facts and citations against the evidence before the lawyer exports it.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/workspace" className="inline-flex h-11 items-center rounded-lg bg-[#315f86] px-5 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(49,95,134,.2)] transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-[#264d70]">Open workspace</Link>
                <Link href="#workflow" className="inline-flex h-11 items-center rounded-lg border border-[#cbd9e5] bg-white px-5 text-sm font-semibold text-[#315f86] transition-colors hover:bg-[#f0f6fa]">See the workflow</Link>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[520px] lg:mx-0">
              <div className="absolute -inset-8 rounded-[38%_62%_60%_40%] bg-[#bcd8ec]/45 blur-2xl" />
              <div className="relative overflow-hidden rounded-[28px] border border-white/90 bg-white/90 p-3 shadow-[0_32px_80px_rgba(36,75,109,.18)] backdrop-blur">
                <div className="rounded-[20px] border border-[#dce7f0] bg-[#f5f9fc] p-5 sm:p-6">
                  <div className="flex items-center justify-between border-b border-[#dce7f0] pb-4">
                    <div className="flex items-center gap-3">
                      <AgentAvatar color="#487aa8" glow="#dce9f4" size={42} interactive />
                      <div><p className="m-0 text-sm font-semibold text-[#183f60]">Veritas is reviewing</p><p className="m-0 mt-0.5 text-[11px] text-[#68839a]">Draft + verify</p></div>
                    </div>
                    <BlobLoading count={3} size={18} />
                  </div>
                  <div className="space-y-3 pt-4">
                    <Activity done label="Draft created from 6 source passages" />
                    <Activity done label="13 factual claims checked" />
                    <Activity label="Reviewing 4 legal authorities" />
                  </div>
                  <div className="mt-5 rounded-xl border border-[#e6d2c5] bg-[#fff9f5] p-4">
                    <div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-[#7c4a2e]">Amount needs a decision</span><span className="rounded-full bg-white px-2 py-0.5 font-mono text-[9px] text-[#9a603d]">2 sources</span></div>
                    <p className="mb-0 mt-2 text-[12px] leading-5 text-[#765b4d]">The facility letter records ₹4.85 crore. The default certificate records ₹5.20 crore.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1180px] border-x border-[#e1e9f0]" id="evidence">
          <div className="grid border-b border-[#e1e9f0] lg:grid-cols-[.8fr_1.2fr]">
            <div className="p-7 sm:p-12 lg:border-r lg:border-[#e1e9f0]">
              <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[#7390a8]">Why it matters</p>
              <h2 className="mt-4 max-w-md font-display text-4xl leading-[1.02] tracking-[-.035em] text-[#183f60] sm:text-5xl">Fluent text can still be wrong.</h2>
            </div>
            <div className="p-7 sm:p-12">
              <p className="m-0 max-w-2xl text-xl leading-8 tracking-[-.015em] text-[#445f75] sm:text-2xl sm:leading-9">A citation can be real while the quotation is false. A quotation can be accurate while the case does not support the sentence. Veritas keeps those questions separate.</p>
              <div className="mt-9 grid gap-px overflow-hidden rounded-2xl border border-[#dce7f0] bg-[#dce7f0] sm:grid-cols-2">
                {dimensions.map(([title, copy]) => <div key={title} className="bg-white p-5"><p className="m-0 font-mono text-[10px] uppercase tracking-[.14em] text-[#d0784c]">{title}</p><p className="mb-0 mt-2 text-sm font-medium text-[#2c526f]">{copy}</p></div>)}
              </div>
            </div>
          </div>

          <div id="workflow" className="border-b border-[#e1e9f0] px-7 py-16 sm:px-12 sm:py-24">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-[#7390a8]">One connected workflow</p><h2 className="mt-3 font-display text-4xl tracking-[-.04em] text-[#183f60] sm:text-5xl">From record to reviewed draft.</h2></div><p className="max-w-sm text-sm leading-6 text-[#637b8f]">The Main Agent coordinates the work. Application code controls access, versions, and every state change.</p></div>
            <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-[#dce7f0] bg-[#dce7f0] md:grid-cols-2 lg:grid-cols-4">
              {steps.map(([number, title, copy]) => <article key={number} className="min-h-64 bg-white p-6"><span className="font-display text-5xl text-[#d8e7f2]">{number}</span><h3 className="mb-0 mt-12 text-lg font-semibold text-[#244b6d]">{title}</h3><p className="mb-0 mt-3 text-sm leading-6 text-[#61788b]">{copy}</p></article>)}
            </div>
          </div>

          <div className="grid lg:grid-cols-2">
            <div className="p-7 sm:p-12 lg:border-r lg:border-[#e1e9f0]">
              <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[#7390a8]">For the lawyer</p>
              <h2 className="mt-4 font-display text-4xl leading-tight tracking-[-.035em] text-[#183f60]">Automation with a visible boundary.</h2>
              <p className="mt-5 max-w-lg text-sm leading-7 text-[#60788c]">Veritas can retrieve, draft, compare, and propose. It cannot conceal an unresolved source or approve its own work. The lawyer sees the passage, the finding, and the version before deciding.</p>
            </div>
            <div className="flex flex-col justify-between bg-[#244b6d] p-7 text-white sm:p-12">
              <div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-[#bbd4e8]">Built for Indian legal teams</p><p className="mt-5 max-w-xl font-display text-3xl leading-tight tracking-[-.025em] text-white">Matter evidence, Indian statutes, judgments, company records, and immutable review history in one place.</p></div>
              <Link href="/register" className="mt-12 inline-flex h-11 w-fit items-center rounded-lg bg-white px-5 text-sm font-semibold text-[#244b6d] transition-transform hover:-translate-y-0.5">Create your workspace</Link>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-[#dce7f0] bg-white px-5 py-8"><div className="mx-auto flex max-w-[1180px] flex-col gap-3 text-xs text-[#6e8496] sm:flex-row sm:items-center sm:justify-between"><span>Veritas. Draft with the evidence beside you.</span><span>Working drafts require lawyer review.</span></div></footer>
    </div>
  );
}

function Activity({ label, done = false }: { label: string; done?: boolean }) {
  return <div className="flex items-center gap-3 rounded-lg border border-[#dce7f0] bg-white px-3 py-2.5"><span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${done ? "bg-[#dff1e6] text-[#247047]" : "bg-[#e5eff7] text-[#487aa8]"}`}>{done ? "✓" : "•"}</span><span className="text-xs font-medium text-[#45627a]">{label}</span></div>;
}
