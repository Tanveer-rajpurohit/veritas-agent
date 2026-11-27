"use client";

import { useState } from "react";
import { Orb, type OrbState, type OrbTone } from "@veritas/ui";
import { ThemeSwitch } from "./theme-switch";

const SURFACES = [
  ["canvas", "bg-canvas"],
  ["surface", "bg-surface"],
  ["surface-raised", "bg-surface-raised"],
  ["surface-muted", "bg-surface-muted"],
  ["surface-hover", "bg-surface-hover"],
  ["surface-selected", "bg-surface-selected"],
  ["accent-soft", "bg-accent-soft"],
] as const;

const INKS = [
  ["ink", "text-ink"],
  ["ink-muted", "text-ink-muted"],
  ["ink-subtle", "text-ink-subtle"],
  ["accent-text", "text-accent-text"],
] as const;

const STATUS = [
  ["success", "bg-success-soft text-success"],
  ["warning", "bg-warning-soft text-warning"],
  ["danger", "bg-danger-soft text-danger"],
  ["info", "bg-info-soft text-info"],
] as const;

const TYPE = [
  ["Heading 3 · 36/40", "text-4xl font-semibold tracking-tight"],
  ["Heading 5 · 24/32", "text-2xl font-semibold tracking-tight"],
  ["Title 2 · 18/28", "text-lg font-medium"],
  ["Body 3 · 16/24", "text-base"],
  ["Body 6 · 14/20", "text-sm"],
  ["Caption 5 · 12/16", "text-xs text-ink-muted"],
] as const;

const SPACING = [4, 8, 12, 16, 24, 32, 48, 64] as const;
const ORB_SIZES = [16, 32, 128] as const;
const ORB_TONES: { tone: OrbTone; mode: string }[] = [
  { tone: "lagoon", mode: "General" },
  { tone: "ember", mode: "Legal" },
  { tone: "moss", mode: "Analyst" },
  { tone: "coral", mode: "Presenter" },
  { tone: "glacier", mode: "Researcher" },
  { tone: "pearl", mode: "Neutral" },
];

export function DesignFoundations() {
  const [orbState, setOrbState] = useState<OrbState>("idle");

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-12 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Orb size={40} label="Veritas" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Design foundations</h1>
            <p className="text-sm text-ink-muted">Live tokens from packages/ui. Check both themes before shipping UI.</p>
          </div>
        </div>
        <ThemeSwitch />
      </header>

      <section aria-labelledby="orb-heading" className="flex flex-col gap-4">
        <h2 id="orb-heading" className="text-lg font-medium">
          Brand mark
        </h2>
        <div className="flex flex-wrap items-end gap-8 rounded-xl border border-line bg-surface p-6">
          {ORB_SIZES.map((s) => (
            <figure key={s} className="flex flex-col items-center gap-2" data-testid={`orb-${s}`}>
              <Orb size={s} state={orbState} />
              <figcaption className="font-mono text-xs text-ink-muted tabular-nums">{s}px</figcaption>
            </figure>
          ))}
          <button
            type="button"
            aria-pressed={orbState === "thinking"}
            onClick={() => setOrbState((s) => (s === "idle" ? "thinking" : "idle"))}
            className="h-10 rounded-lg border border-line-strong bg-surface px-4 text-sm font-semibold transition-colors duration-150 ease-out-soft hover:bg-surface-hover active:scale-[0.98]"
          >
            {orbState === "thinking" ? "Show idle state" : "Show thinking state"}
          </button>
        </div>
        <ul className="grid grid-cols-2 gap-6 rounded-xl border border-line bg-surface p-6 sm:grid-cols-3 lg:grid-cols-6">
          {ORB_TONES.map(({ tone, mode }) => (
            <li key={tone} className="flex flex-col items-center gap-3" data-testid={`tone-${tone}`}>
              <Orb size={96} tone={tone} state={orbState} />
              <span className="text-sm text-ink-muted">{mode}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="color-heading" className="flex flex-col gap-4">
        <h2 id="color-heading" className="text-lg font-medium">
          Colour
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SURFACES.map(([name, cls]) => (
            <li key={name} className={`flex h-20 items-end rounded-lg border border-line p-3 text-sm ${cls}`}>
              {name}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-6 rounded-xl border border-line bg-surface p-6">
          {INKS.map(([name, cls]) => (
            <p key={name} className={`text-base ${cls}`}>
              {name}: The quick brown fox
            </p>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          {STATUS.map(([name, cls]) => (
            <span key={name} className={`rounded-md px-3 py-1 text-sm font-medium ${cls}`}>
              {name}
            </span>
          ))}
          <button
            type="button"
            className="h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-ink transition-colors duration-150 ease-out-soft hover:bg-accent-hover active:scale-[0.98]"
          >
            Primary action
          </button>
        </div>
      </section>

      <section aria-labelledby="type-heading" className="flex flex-col gap-4">
        <h2 id="type-heading" className="text-lg font-medium">
          Type scale (Space Grotesk)
        </h2>
        <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6">
          {TYPE.map(([name, cls]) => (
            <p key={name} className={cls}>
              {name}
            </p>
          ))}
          <p className="font-mono text-sm tabular-nums">PT Mono · 1,204.50 · 08:42</p>
        </div>
      </section>

      <section aria-labelledby="space-heading" className="flex flex-col gap-4">
        <h2 id="space-heading" className="text-lg font-medium">
          Spacing (4px scale)
        </h2>
        <ul className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-6">
          {SPACING.map((s) => (
            <li key={s} className="flex items-center gap-4">
              <span className="w-12 font-mono text-xs text-ink-muted tabular-nums">{s}px</span>
              <span className="h-3 rounded-xs bg-accent" style={{ width: s }} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
