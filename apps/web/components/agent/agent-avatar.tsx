"use client";

import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

interface AgentAvatarProps {
  color: string;
  glow: string;
  size?: number;
  interactive?: boolean;
  label?: string;
  animationDelay?: string;
}

export function AgentAvatar({
  color,
  glow,
  size = 28,
  interactive = false,
  label,
  animationDelay = "0s",
}: AgentAvatarProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [gaze, setGaze] = useState({ x: 0, y: 0 });

  const handlePointerMove = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (!interactive || !containerRef.current) return;

    const bounds = containerRef.current.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;

    setGaze({
      x: Math.max(-1, Math.min(1, x)) * 2.4,
      y: Math.max(-1, Math.min(1, y)) * 1.8,
    });
  };

  return (
    <span
      ref={containerRef}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setGaze({ x: 0, y: 0 })}
      className="agent-avatar inline-flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        filter: `drop-shadow(0 2px 4px ${glow})`,
        animationDelay,
      }}
    >
      <svg
        viewBox="0 0 40 40"
        width={size}
        height={size}
        className="overflow-visible"
      >
        <path
          d="M20 3.2c7.7-.3 14.4 5.4 15.8 12.9 1.4 7.2-2.4 14.8-9 18.1-6.7 3.4-15.2 1.3-19.6-4.8C2.8 23.3 3.8 14.7 9.5 9 12.4 6 16.1 3.4 20 3.2Z"
          fill={color}
        />
        <g
          className="agent-avatar__eyes"
          style={{
            transform: `translate(${gaze.x}px, ${gaze.y}px)`,
            transformOrigin: "20px 19px",
            animationDelay,
          }}
        >
          <rect
            x="14.2"
            y="14.8"
            width="3.3"
            height="10.2"
            rx="1.65"
            fill="white"
            transform="rotate(-10 15.85 19.9)"
          />
          <rect
            x="22.1"
            y="14.8"
            width="3.3"
            height="10.2"
            rx="1.65"
            fill="white"
            transform="rotate(-10 23.75 19.9)"
          />
        </g>
      </svg>
    </span>
  );
}
