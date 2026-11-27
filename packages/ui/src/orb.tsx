import { useId } from "react";

export type OrbState = "idle" | "thinking";

type OrbProps = {
  size?: number;
  state?: OrbState;
  /** Accessible name. Omit when the orb sits next to visible text that names it. */
  label?: string;
  className?: string;
};

/**
 * The Veritas mark: a sphere lit from the left. The lit side falls off into
 * a deep shadow, with a thin reflected rim light on the right edge that
 * sells the 3D form. In the "thinking" state a soft band of light circles it.
 */
export function Orb({ size = 32, state = "idle", label, className }: OrbProps) {
  const id = useId().replace(/:/g, "");
  const body = `orb-body-${id}`;
  const rim = `orb-rim-${id}`;
  const spec = `orb-spec-${id}`;
  const sweep = `orb-sweep-${id}`;
  const clip = `orb-clip-${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-state={state}
    >
      <defs>
        {/* Key light from the left: bright on the left, deep shadow on the right. */}
        <radialGradient id={body} cx="0.22" cy="0.42" r="0.92">
          <stop offset="0" stopColor="var(--vt-orb-core)" />
          <stop offset="0.3" stopColor="var(--vt-orb-mid)" />
          <stop offset="0.72" stopColor="var(--vt-orb-edge)" />
          <stop offset="1" stopColor="var(--vt-orb-shadow)" />
        </radialGradient>
        {/* Reflected light catching the far (right) edge. */}
        <radialGradient id={rim} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.82" stopColor="var(--vt-orb-rim)" stopOpacity="0" />
          <stop offset="0.97" stopColor="var(--vt-orb-rim)" stopOpacity="0.7" />
          <stop offset="1" stopColor="var(--vt-orb-rim)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={spec} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={sweep} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--vt-orb-core)" stopOpacity="0" />
          <stop offset="0.5" stopColor="var(--vt-orb-core)" stopOpacity="0.5" />
          <stop offset="1" stopColor="var(--vt-orb-core)" stopOpacity="0" />
        </linearGradient>
        <clipPath id={clip}>
          <circle cx="32" cy="32" r="28" />
        </clipPath>
      </defs>
      <circle cx="32" cy="32" r="28" fill={`url(#${body})`} />
      <g clipPath={`url(#${clip})`}>
        {/* Rim only on the right half, where reflected light would land. */}
        <circle cx="34" cy="32" r="28" fill={`url(#${rim})`} clipPath={`url(#${clip})`} />
        {state === "thinking" ? (
          <rect className="vt-orb-sweep" x="4" y="26" width="56" height="12" fill={`url(#${sweep})`} />
        ) : null}
      </g>
      <ellipse cx="17" cy="25" rx="6" ry="8" fill={`url(#${spec})`} transform="rotate(18 17 25)" />
    </svg>
  );
}
