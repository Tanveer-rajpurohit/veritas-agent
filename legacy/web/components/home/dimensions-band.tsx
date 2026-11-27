import { SectionTitle } from "./cards";
import { Reveal } from "./motion";

const DIMENSIONS = [
  { name: "Identity", chip: "Supported", tone: "bg-ok-wash text-ok-ink" },
  { name: "Quotation", chip: "Mismatch flagged", tone: "bg-bad-wash text-bad-ink" },
  { name: "Support", chip: "Needs review", tone: "bg-warn-wash text-warn-ink" },
  { name: "Treatment", chip: "Not checked", tone: "bg-idle-wash text-idle-ink" },
];

export function DimensionsBand() {
  return (
    <section className="mx-auto w-full max-w-3xl px-5 pt-24 pb-4 text-center sm:px-8">
      <Reveal>
        <SectionTitle
          title="Citation checks, split four ways."
          copy="One green tick hides the difference between a case that exists and a quote it never contained. Each axis gets its own finding."
        />
        <div className="-mt-4 flex flex-wrap items-center justify-center gap-2.5">
          {DIMENSIONS.map((dimension) => (
            <span key={dimension.name} className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-4 py-2 text-[13px] font-medium text-ink shadow-sm">
              {dimension.name}
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${dimension.tone}`}>{dimension.chip}</span>
            </span>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
