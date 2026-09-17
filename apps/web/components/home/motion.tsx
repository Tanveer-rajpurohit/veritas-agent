"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, type ReactNode } from "react";

function motionAllowed(): boolean {
  return typeof window !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!motionAllowed() || !rootRef.current) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.from(rootRef.current, {
        y: 28,
        autoAlpha: 0,
        duration: 0.8,
        delay,
        ease: "power3.out",
        scrollTrigger: { trigger: rootRef.current, start: "top 88%", once: true },
      });
    }, rootRef);
    return () => ctx.revert();
  }, [delay]);

  return (
    <div ref={rootRef} className={className}>
      {children}
    </div>
  );
}
