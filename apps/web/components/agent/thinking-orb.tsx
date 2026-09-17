"use client";

import { ThinkingOrb as CanvasThinkingOrb } from "thinking-orbs";

export type OrbState =
  | "working"
  | "searching"
  | "solving"
  | "listening"
  | "connecting"
  | "weaving"
  | "composing"
  | "breathing"
  | "shaping";

interface ThinkingOrbProps {
  size?: number;
  className?: string;
  state?: OrbState;
  isThinking?: boolean;
}

export function ThinkingOrb({
  size = 20,
  className = "",
  state,
  isThinking = false,
}: ThinkingOrbProps) {
  const activeState: OrbState = state || (isThinking ? "working" : "composing");

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <CanvasThinkingOrb state={activeState} size={size <= 24 ? 20 : 64} theme="light" />
    </div>
  );
}
