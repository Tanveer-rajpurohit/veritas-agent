import type { CSSProperties } from "react";
import { useId } from "react";

export type OrbState = "idle" | "thinking";
export type OrbTone = "lagoon" | "ember" | "moss" | "coral" | "glacier" | "pearl";

type OrbProps = {
  size?: number;
  state?: OrbState;
  /** Colour family. Each agent mode has its own tone. */
  tone?: OrbTone;
  /** Accessible name. Omit when the orb sits next to visible text that names it. */
  label?: string;
  className?: string;
};

/** [base, blob A, blob B, blob C, blob D]. Brand art, not UI tokens. */
const PALETTES: Record<OrbTone, readonly [string, string, string, string, string]> = {
  lagoon: ["#14b8a6", "#0b4f4a", "#a7f3d0", "#fb923c", "#0891b2"],
  ember: ["#f97316", "#7c2d12", "#fdba74", "#dc2626", "#fbbf24"],
  moss: ["#4ade80", "#14532d", "#d9f99d", "#0d9488", "#a3e635"],
  coral: ["#fb7185", "#9f1239", "#fed7aa", "#f97316", "#fecdd3"],
  glacier: ["#7dd3fc", "#075985", "#f0f9ff", "#2dd4bf", "#bae6fd"],
  pearl: ["#e5e5e5", "#a3a3a3", "#fafafa", "#d4d4d4", "#ccfbf1"],
};

/** Blob layout: centre, radii, and how fast/which way each one drifts. */
const BLOBS = [
  { cx: 30, cy: 34, rx: 34, ry: 26, speed: 1, reverse: false },
  { cx: 70, cy: 64, rx: 30, ry: 30, speed: 1.4, reverse: true },
  { cx: 40, cy: 78, rx: 26, ry: 20, speed: 0.8, reverse: false },
  { cx: 72, cy: 24, rx: 22, ry: 18, speed: 1.7, reverse: true },
] as const;

const IDLE_SECONDS = 22;
const THINKING_SECONDS = 5;

/**
 * The Veritas mark: soft colour fields drifting inside a sphere, with a
 * fine grain and an edge shade that give it volume. It drifts slowly when
 * idle and quickens while the agent is thinking. Motion stops under
 * prefers-reduced-motion (see tokens.css).
 */
export function Orb({ size = 32, state = "idle", tone = "lagoon", label, className }: OrbProps) {
  const id = useId().replace(/:/g, "");
  const [base, ...blobColors] = PALETTES[tone];
  const clip = `orb-clip-${id}`;
  const blur = `orb-blur-${id}`;
  const grain = `orb-grain-${id}`;
  const shade = `orb-shade-${id}`;
  const shine = `orb-shine-${id}`;
  const cycle = state === "thinking" ? THINKING_SECONDS : IDLE_SECONDS;
  // Grain reads as noise below ~40px, so small marks stay smooth.
  const showGrain = size >= 40;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-state={state}
      data-tone={tone}
    >
      <defs>
        <clipPath id={clip}>
          <circle cx="50" cy="50" r="49" />
        </clipPath>
        <filter id={blur} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id={grain} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.5 0" />
        </filter>
        <radialGradient id={shade} cx="0.42" cy="0.38" r="0.62">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.28" />
        </radialGradient>
        <radialGradient id={shine} cx="0.3" cy="0.24" r="0.4">
          <stop offset="0" stopColor="#fff" stopOpacity="0.18" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect width="100" height="100" fill={base} />
        <g filter={`url(#${blur})`}>
          {BLOBS.map((b, i) => (
            <g
              key={i}
              className="vt-orb-blob"
              style={
                {
                  animationDuration: `${cycle / b.speed}s`,
                  animationDirection: b.reverse ? "reverse" : "normal",
                } satisfies CSSProperties
              }
            >
              <ellipse cx={b.cx} cy={b.cy} rx={b.rx} ry={b.ry} fill={blobColors[i]} />
            </g>
          ))}
        </g>
        <rect width="100" height="100" fill={`url(#${shine})`} />
        <rect width="100" height="100" fill={`url(#${shade})`} />
        {showGrain ? (
          <rect width="100" height="100" filter={`url(#${grain})`} opacity="0.55" style={{ mixBlendMode: "overlay" }} />
        ) : null}
      </g>
    </svg>
  );
}
