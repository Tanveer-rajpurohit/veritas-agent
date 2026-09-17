"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { VeritasOrb } from "../brand/veritas-orb";

export function SiteNav() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let animationFrameId: number;

    const handleScroll = () => {
      animationFrameId = window.requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        const startThreshold = 40;
        const scrollRange = 460;
        const effectiveScroll = Math.max(0, scrollY - startThreshold);
        const p = Math.min(1, Math.max(0, effectiveScroll / scrollRange));
        setProgress(p);
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const navMaxWidth = 1140 - progress * 500;
  const navMarginTop = 16 - progress * 4;
  const navPaddingY = 12 - progress * 4;
  const navPaddingX = 24 - progress * 6;

  return (
    <header className="fixed top-0 left-0 right-0 z-40 pointer-events-none">
      <div className="mx-auto px-4 sm:px-6">
        <nav
          className="pointer-events-auto mx-auto flex items-center justify-between rounded-lg border transition-[max-width,margin,padding,box-shadow,border-color,background-color,backdrop-filter] duration-200 ease-out"
          style={{
            maxWidth: `min(calc(100vw - 2rem), ${navMaxWidth}px)`,
            marginTop: `${navMarginTop}px`,
            paddingTop: `${navPaddingY}px`,
            paddingBottom: `${navPaddingY}px`,
            paddingLeft: `${navPaddingX}px`,
            paddingRight: `${navPaddingX}px`,
            backgroundColor: `rgba(255, 255, 255, ${0.88 + progress * 0.1})`,
            borderColor: `rgba(215, 228, 240, ${0.5 + progress * 0.4})`,
            boxShadow:
              progress > 0.05
                ? `0px 4px 20px -2px rgba(46, 95, 163, ${progress * 0.12}), 0px 0px 0px 1px rgba(255, 255, 255, 0.8)`
                : "none",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
          }}
        >
          <div className="flex items-center gap-6 sm:gap-8">
            {/* Direct icon with proper visible colors: NO box, NO circle around it */}
            <Link
              href="/"
              className="flex items-center gap-2.5 text-stone-900 font-display italic text-xl sm:text-2xl font-normal tracking-tight hover:opacity-85 transition-opacity"
            >
              <VeritasOrb size={22} className="not-italic text-[#487aa8]" />
              <span className="not-italic font-display font-medium text-stone-900 text-xl tracking-tight">
                Veritas
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-6 text-xs md:text-[13px] font-medium text-stone-600">
              <Link
                href="#overview"
                className="rounded-sm transition-colors hover:text-stone-900"
              >
                Product
              </Link>
              <Link
                href="#evidence"
                className="rounded-sm transition-colors hover:text-stone-900"
              >
                Evidence
              </Link>
              <Link
                href="#workflow"
                className="rounded-sm transition-colors hover:text-stone-900"
              >
                Workflow
              </Link>
              <Link
                href="#plans"
                className="rounded-sm transition-colors hover:text-stone-900"
              >
                Pricing
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden text-xs md:text-[13px] font-medium text-stone-600 transition-colors hover:text-stone-900 sm:block"
            >
              Login
            </Link>

            <Link
              href="/login"
              className="flex items-center justify-center rounded-md bg-[#487aa8] px-4 py-1.5 text-xs font-medium text-white shadow-xs transition-all hover:bg-[#3d6991] active:scale-95 md:text-[13px]"
            >
              Launch Workspace
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
