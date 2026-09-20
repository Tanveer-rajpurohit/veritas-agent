"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";

const NAMES = ["veritas", "veritas-agent", "veritas-legal", "veritas-brief"];

export function BlobLoading({ count = 4, size = 28 }: { count?: number; size?: number }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const shown = NAMES.slice(0, Math.min(Math.max(count, 2), 4));

  useEffect(() => {
    if (!rowRef.current) return;
    const blobs = rowRef.current.querySelectorAll(".blob-item");
    const tween = gsap.to(blobs, {
      y: -9,
      scale: 1.08,
      duration: 0.42,
      ease: "power2.inOut",
      stagger: { each: 0.12, yoyo: true, repeat: -1 },
      yoyo: true,
      repeat: -1,
    });
    return () => {
      tween.kill();
    };
  }, []);

  return (
    <div ref={rowRef} className="flex items-center gap-2" aria-label="Loading">
      {shown.map((n) => (
        <Image
          key={n}
          src={`https://blobatar.dev/?name=${n}`}
          alt=""
          width={size}
          height={size}
          className="blob-item rounded-full"
          unoptimized
        />
      ))}
    </div>
  );
}
