import { CardLabel, SectionTitle } from "./cards";
import { Reveal } from "./motion";

const SMALL = [
  { title: "No guesswork", copy: "Missing evidence is marked unresolved, never filled in." },
  { title: "Recheck in one click", copy: "Rerun checks for edited lines without redoing the brief." },
  { title: "Reviewer-ready counts", copy: "States replace vague scores: 8 of 12 reviewed." },
];

export function FactCards() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pt-20 sm:px-8">
      <Reveal>
        <SectionTitle title="Fact check without the file hunt." />
      </Reveal>
      <div className="grid gap-5 md:grid-cols-2">
        <Reveal className="flex min-h-[22rem] flex-col rounded-lg bg-muted p-7 sm:p-9">
          <CardLabel>Compare without limits</CardLabel>
          <h3 className="m-0 pt-4 pb-6 text-xl font-semibold tracking-tight">Every amount, compared</h3>
          <div className="flex flex-1 items-center justify-center pb-6">
            <div className="flex w-full max-w-xs items-center justify-between gap-3 rounded-lg bg-white px-5 py-6 shadow-sm">
              <div className="text-center">
                <p className="m-0 font-display text-2xl text-ink">₹4.85 Cr</p>
                <p className="m-0 pt-1 text-[11px] text-ink-muted">Ledger · p2</p>
              </div>
              <span className="rounded-md bg-bad-wash px-2.5 py-1 text-[11px] font-semibold text-bad-ink">≠</span>
              <div className="text-center">
                <p className="m-0 font-display text-2xl text-ink">₹5.20 Cr</p>
                <p className="m-0 pt-1 text-[11px] text-ink-muted">Certificate · p1</p>
              </div>
            </div>
          </div>
          <p className="m-0 pb-1 text-sm leading-relaxed text-ink-muted">
            Figures and dates are matched across records with units normalised.
          </p>
        </Reveal>
        <Reveal delay={0.08} className="flex min-h-[22rem] flex-col rounded-lg bg-muted p-7 sm:p-9">
          <CardLabel>Trace every citation</CardLabel>
          <h3 className="m-0 pt-4 pb-6 text-xl font-semibold tracking-tight">Every authority, accounted for</h3>
          <div className="flex flex-1 flex-col justify-center gap-2 pb-6">
            <div className="rounded-md bg-info-wash p-3.5 shadow-sm">
              <p className="m-0 text-[13px] leading-relaxed text-info-ink">Identity of 2026 INSC 668 confirmed in official records.</p>
            </div>
            <div className="self-end rounded-md bg-white p-3.5 shadow-sm">
              <p className="m-0 text-[13px] text-ink">And the paragraph it quotes?</p>
            </div>
            <div className="rounded-md bg-info-wash p-3.5 shadow-sm">
              <p className="m-0 text-[13px] leading-relaxed text-info-ink">Those words differ from the authentic text. Flagged.</p>
            </div>
          </div>
          <p className="m-0 pb-1 text-sm leading-relaxed text-ink-muted">
            Identity, quotation, support and treatment each get their own finding.
          </p>
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
