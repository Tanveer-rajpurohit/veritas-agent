import { Bars, CardLabel, SectionTitle } from "./cards";
import { Reveal } from "./motion";

const SMALL = [
  { title: "Request edits", copy: "Ask for a section in plain words and keep editing in the canvas." },
  { title: "Stale on edit", copy: "Change a reviewed line and its checks retire on the spot." },
  { title: "Gated export", copy: "Reviewed PDF unlocks only when blocking findings clear." },
];

export function EaseCards() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pt-20 sm:px-8">
      <Reveal>
        <SectionTitle title="Writing briefs has never been easier." />
      </Reveal>
      <div className="grid gap-5 md:grid-cols-2">
        <Reveal className="flex min-h-[22rem] flex-col rounded-lg bg-[#f4f4f6] p-7 sm:p-9">
          <CardLabel>Upload to start</CardLabel>
          <h3 className="m-0 pt-4 pb-6 text-xl font-semibold tracking-tight">Draft from the files you have</h3>
          <div className="flex flex-1 flex-col items-center justify-center pb-6">
            <div className="flex w-full max-w-xs flex-col items-center gap-2 rounded-lg border-2 border-dashed border-line-strong bg-white/60 px-4 py-8">
              <span className="text-[13px] font-medium text-ink">Drop records here</span>
              <span className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-ink shadow-sm">Browse files</span>
            </div>
          </div>
          <p className="m-0 pb-1 text-sm leading-relaxed text-ink-muted">
            Your records become page-aware text the writer can cite.
          </p>
        </Reveal>
        <Reveal delay={0.08} className="flex min-h-[22rem] flex-col rounded-lg bg-[#f4f4f6] p-7 sm:p-9">
          <CardLabel>Add any source</CardLabel>
          <h3 className="m-0 pt-4 pb-6 text-xl font-semibold tracking-tight">Support every line</h3>
          <div className="grid flex-1 grid-cols-2 content-center gap-3 pb-6">
            <div className="rounded-md bg-white p-3 shadow-sm">
              <p className="m-0 pb-2 text-[11px] font-semibold text-ink-muted">BEFORE</p>
              <Bars count={4} />
            </div>
            <div className="rounded-md bg-white p-3 shadow-sm">
              <p className="m-0 pb-2 text-[11px] font-semibold text-ink-accent">AFTER</p>
              <p className="m-0 pb-2 text-xs leading-relaxed text-ink">Default of ₹5.20 crore, certificate p1.</p>
              <span className="rounded-md bg-ok-wash px-2 py-0.5 text-[10px] font-semibold text-ok-ink">Linked</span>
            </div>
          </div>
          <p className="m-0 pb-1 text-sm leading-relaxed text-ink-muted">Each claim keeps a link to its passage.</p>
        </Reveal>
      </div>
      <div className="grid gap-5 pt-5 sm:grid-cols-3">
        {SMALL.map((item, index) => (
          <Reveal key={item.title} delay={Math.min(index * 0.06, 0.12)} className="flex flex-col rounded-lg bg-muted p-7">
            <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-white font-display text-base text-ink-accent italic shadow-sm">
              {index + 1}
            </span>
            <h3 className="m-0 pb-2 text-[15px] font-semibold">{item.title}</h3>
            <p className="m-0 text-sm leading-relaxed text-ink-muted">{item.copy}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
