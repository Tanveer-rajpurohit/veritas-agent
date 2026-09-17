import Link from "next/link";
import type { ReactNode } from "react";

export function Bars({ count, tone = "bg-border" }: { count: number; tone?: string }) {
  return (
    <div className="flex flex-col gap-1.5" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className={`h-1.5 rounded-full ${tone} ${index === count - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

export function AboutLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 self-start rounded-full bg-white px-4 py-2 text-[13px] font-medium text-ink no-underline shadow-sm transition-all hover:text-ink-accent active:scale-95"
    >
      {label}
      <span aria-hidden="true">›</span>
    </Link>
  );
}

export function CardLabel({ children, solid = false }: { children: ReactNode; solid?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1 text-[11px] font-semibold ${
        solid ? "bg-primary text-white" : "bg-white text-ink"
      }`}
    >
      {children}
    </span>
  );
}

export function SectionTitle({ eyebrow, title, copy }: { eyebrow?: string; title: string; copy?: string }) {
  return (
    <div className="mx-auto max-w-xl pb-10 text-center">
      {eyebrow ? <p className="m-0 pb-3 font-mono text-[13px] text-ink-accent">{eyebrow}</p> : null}
      <h2 className="m-0 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h2>
      {copy ? <p className="m-0 mx-auto max-w-lg pt-4 text-[15px] leading-relaxed text-ink-muted">{copy}</p> : null}
    </div>
  );
}
