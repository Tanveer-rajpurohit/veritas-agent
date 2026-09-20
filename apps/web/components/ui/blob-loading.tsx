"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

function Blob({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className="blob-item overflow-visible" aria-hidden="true">
      <path
        d="M20 3.2c7.7-.3 14.4 5.4 15.8 12.9 1.4 7.2-2.4 14.8-9 18.1-6.7 3.4-15.2 1.3-19.6-4.8C2.8 23.3 3.8 14.7 9.5 9 12.4 6 16.1 3.4 20 3.2Z"
        fill="#487aa8"
      />
      <ellipse cx="15.8" cy="19.4" rx="2.2" ry="4.8" fill="white" />
      <ellipse cx="24.2" cy="19.4" rx="2.2" ry="4.8" fill="white" />
    </svg>
  );
}

export function BlobLoading({ count = 4, size = 28 }: { count?: number; size?: number }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const n = Math.min(Math.max(count, 2), 4);

  useEffect(() => {
    if (!rowRef.current) return;
    const blobs = rowRef.current.querySelectorAll(".blob-item");
    const tween = gsap.to(blobs, {
      y: -9,
      scale: 1.08,
      duration: 0.42,
      ease: "power2.inOut",
      stagger: { each: 0.12 },
      yoyo: true,
      repeat: -1,
    });
    return () => {
      tween.kill();
    };
  }, []);

  return (
    <div ref={rowRef} className="flex items-center gap-2" aria-label="Loading">
      {Array.from({ length: n }).map((_, i) => (
        <Blob key={i} size={size} />
      ))}
    </div>
  );
}
