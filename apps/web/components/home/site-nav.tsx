"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { VeritasOrb } from "../brand/veritas-orb";

const NAV_LINKS = [
  { href: "#overview", label: "Product" },
  { href: "#evidence", label: "Evidence" },
  { href: "#workflow", label: "Workflow" },
  { href: "#plans", label: "Pricing" },
] as const;

const SCROLL_START = 40;
const SCROLL_RANGE = 460;

/**
 * Per-frame lerp factor. 0.12 settles in ~20 frames (~330ms @60fps).
 * The smoothing lives here rather than in a CSS `transition` because
 * transitioning a value that is *also* rewritten every frame double-smooths it,
 * which is what made the shrink feel rubbery.
 */
const LERP = 0.12;

export function SiteNav() {
  const navRef = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let current = 0;
    let target = 0;
    let frame = 0;

    const readTarget = () => {
      const travelled = Math.max(0, window.scrollY - SCROLL_START);
      target = Math.min(1, travelled / SCROLL_RANGE);
    };

    // One custom property per frame. Every derived value (width, padding,
    // alpha, shadow) interpolates in CSS from it, so scrolling never triggers a
    // React render — the previous version called setState on every rAF tick,
    // which re-rendered the whole nav at Lenis' ~120Hz.
    const write = (value: number) => nav.style.setProperty("--p", value.toFixed(4));

    const tick = () => {
      current += (target - current) * LERP;

      if (Math.abs(target - current) < 0.0005) {
        current = target;
        write(current);
        frame = 0; // settled — stop burning frames until the next scroll
        return;
      }

      write(current);
      frame = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      readTarget();

      if (reduceMotion) {
        current = target;
        write(current);
        return;
      }

      // Guard against queueing a second loop: the old code called rAF on every
      // scroll event and only ever cancelled the last id.
      if (!frame) frame = requestAnimationFrame(tick);
    };

    readTarget();
    current = target;
    write(current);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header className="pointer-events-none fixed top-0 right-0 left-0 z-40">
      <div className="mx-auto px-4 sm:px-6">
        <nav
          ref={navRef}
          style={
            {
              "--p": 0,
              maxWidth: "min(calc(100vw - 2rem), calc(1140px - var(--p) * 500px))",
              marginTop: "calc(16px - var(--p) * 4px)",
              paddingBlock: "calc(12px - var(--p) * 4px)",
              paddingInline: "calc(24px - var(--p) * 6px)",
              backgroundColor: "rgb(255 255 255 / calc(0.88 + var(--p) * 0.1))",
              borderColor: "rgb(215 228 240 / calc(0.5 + var(--p) * 0.4))",
              boxShadow:
                "0 4px 20px -2px rgb(46 95 163 / calc(var(--p) * 0.12)), 0 0 0 1px rgb(255 255 255 / calc(var(--p) * 0.8))",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
            } as CSSProperties
          }
          className="pointer-events-auto mx-auto flex flex-col rounded-lg border"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-6 sm:gap-8">
              <Link
                href="/"
                className="flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-85"
              >
                <VeritasOrb size={22} className="text-brand-strong" />
                <span className="font-display text-xl font-medium tracking-tight text-stone-900">
                  Veritas
                </span>
              </Link>

              <div className="hidden items-center gap-6 text-[13px] font-medium text-stone-600 md:flex">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-sm transition-colors hover:text-stone-900"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <Link
                href="/login"
                className="hidden text-[13px] font-medium text-stone-600 transition-colors hover:text-stone-900 sm:block"
              >
                Login
              </Link>

              <Link
                href="/login"
                className="flex items-center justify-center rounded-md bg-brand-strong px-4 py-1.5 text-xs font-medium whitespace-nowrap text-white shadow-xs transition-colors hover:bg-[#3d6991] active:scale-95 md:text-[13px]"
              >
                Launch Workspace
              </Link>

              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-controls="site-nav-mobile"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                className="-mr-1.5 flex size-9 items-center justify-center rounded-md text-stone-700 transition-colors hover:bg-stone-100 md:hidden"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  {menuOpen ? (
                    <>
                      <path d="M6 6 18 18" />
                      <path d="M18 6 6 18" />
                    </>
                  ) : (
                    <>
                      <path d="M3.5 7h17" />
                      <path d="M3.5 12h17" />
                      <path d="M3.5 17h17" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          <div
            id="site-nav-mobile"
            hidden={!menuOpen}
            className="grid gap-0.5 border-t border-stone-200/80 pt-3 pb-1 md:hidden"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-md px-2 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-900"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="rounded-md px-2 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-900 sm:hidden"
            >
              Login
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
