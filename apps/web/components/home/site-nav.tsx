"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { VeritasOrb } from "../brand/veritas-orb";

const NAV_LINKS = [
  { href: "#overview", label: "Product" },
  { href: "#evidence", label: "Evidence" },
  { href: "#workflow", label: "Workflow" },
] as const;

const SCROLL_START = 40;
const SCROLL_RANGE = 460;
const LERP = 0.12;

export function SiteNav() {
  const navRef = useRef<HTMLElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const menuCardRef = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);

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

    const write = (value: number) => nav.style.setProperty("--p", value.toFixed(4));

    const tick = () => {
      current += (target - current) * LERP;

      if (Math.abs(target - current) < 0.0005) {
        current = target;
        write(current);
        frame = 0;
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
    if (!overlayRef.current || !menuCardRef.current) return;

    const ctx = gsap.context(() => {
      gsap.set(overlayRef.current, { display: "none", opacity: 0 });
      gsap.set(menuCardRef.current, {
        xPercent: 105,
        opacity: 0,
        scale: 0.95,
        transformOrigin: "top right",
      });

      tl.current = gsap
        .timeline({
          paused: true,
          onStart: () => {
            gsap.set(overlayRef.current, { display: "flex" });
          },
          onReverseComplete: () => {
            gsap.set(overlayRef.current, { display: "none" });
          },
        })
        .to(overlayRef.current, {
          opacity: 1,
          duration: 0.35,
          ease: "power2.out",
        })
        .to(
          menuCardRef.current,
          {
            xPercent: 0,
            opacity: 1,
            scale: 1,
            duration: 0.55,
            ease: "power4.out",
          },
          "-=0.25"
        )
        .fromTo(
          ".mobile-menu-header",
          { y: -12, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.35, ease: "power3.out" },
          "-=0.35"
        )
        .fromTo(
          ".mobile-nav-link",
          { yPercent: 125, opacity: 0 },
          {
            yPercent: 0,
            opacity: 1,
            duration: 0.5,
            stagger: 0.05,
            ease: "power4.out",
          },
          "-=0.3"
        )
        .fromTo(
          ".mobile-menu-footer",
          { y: 16, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" },
          "-=0.25"
        );
    });

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (isMenuOpen) {
      tl.current?.timeScale(1).play();
    } else {
      tl.current?.timeScale(1.4).reverse();
    }
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMenuOpen]);

  return (
    <>
      <header className="pointer-events-none fixed top-0 right-0 left-0 z-40">
        <div className="mx-auto px-4 sm:px-6">
          <nav
            ref={navRef}
            style={
              {
                "--p": 0,
                maxWidth: "min(calc(100vw - 2rem), calc(1140px - var(--p) * 500px))",
                marginTop: "calc(16px - var(--p) * 4px)",
                paddingBlock: "calc(8px - var(--p) * 2px)",
                paddingInline: "calc(18px - var(--p) * 4px)",
                backgroundColor: "rgb(255 255 255 / calc(0.88 + var(--p) * 0.1))",
                borderColor: "rgb(215 228 240 / calc(0.5 + var(--p) * 0.4))",
                boxShadow:
                  "0 4px 20px -2px rgb(46 95 163 / calc(var(--p) * 0.12)), 0 0 0 1px rgb(255 255 255 / calc(var(--p) * 0.8))",
                backdropFilter: "blur(14px)",
                WebkitBackdropFilter: "blur(14px)",
              } as CSSProperties
            }
            className="pointer-events-auto mx-auto hidden md:flex items-center justify-between rounded-lg border"
          >
            <div className="flex min-w-0 items-center gap-6 sm:gap-8">
              <Link
                href="/"
                className="flex shrink-0 items-center gap-2 sm:gap-2.5 transition-opacity hover:opacity-85"
              >
                <VeritasOrb size={22} className="text-brand-strong" />
                <span className="font-display text-lg sm:text-xl font-medium tracking-tight text-stone-900">
                  Veritas
                </span>
              </Link>

              <div className="flex items-center gap-6 text-[13px] font-medium text-stone-600">
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

            <div className="flex shrink-0 items-center gap-3">
              <Link href="/login" className="text-xs font-semibold text-stone-600 hover:text-[#315f86]">
                Log in
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-md bg-brand-strong px-3.5 py-[7px] text-xs font-semibold whitespace-nowrap text-white shadow-2xs transition-colors hover:bg-[#3d6991] active:scale-95 md:text-[13px]"
              >
                Create workspace
              </Link>
            </div>
          </nav>
        </div>

        <div className="pointer-events-auto fixed top-4 right-4 z-40 md:hidden">
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Open navigation menu"
            className="group flex h-10 w-10 items-center justify-center rounded-md border border-stone-200/90 bg-white shadow-xs transition-all hover:bg-stone-50 active:scale-95 cursor-pointer"
          >
            <div className="flex flex-col items-center justify-center gap-[4.5px] w-[18px]">
              <span className="block h-[2px] w-full rounded-full bg-stone-800 transition-all duration-200 group-hover:bg-[#487aa8]" />
              <span className="block h-[2px] w-[70%] self-end rounded-full bg-stone-800 transition-all duration-200 group-hover:w-full group-hover:bg-[#487aa8]" />
              <span className="block h-[2px] w-full rounded-full bg-stone-800 transition-all duration-200 group-hover:bg-[#487aa8]" />
            </div>
          </button>
        </div>
      </header>

      <div
        ref={overlayRef}
        onClick={() => setIsMenuOpen(false)}
        className="fixed inset-0 z-50 flex items-start justify-end p-3.5 sm:p-5 bg-stone-950/40 backdrop-blur-md"
        style={{ display: "none" }}
      >
        <div
          ref={menuCardRef}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[320px] rounded-lg bg-white/95 backdrop-blur-xl text-stone-900 p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(15,30,60,0.3)] border border-stone-200/90 flex flex-col justify-between min-h-[440px] overflow-hidden"
          role="dialog"
          aria-modal="true"
        >
          <div>
            <div className="mobile-menu-header flex items-center justify-between pb-5 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <VeritasOrb size={18} className="text-[#487aa8]" />
                <span className="font-mono text-xs uppercase tracking-widest text-[#487aa8] font-bold">
                  Navigation
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                aria-label="Close menu"
                className="group rounded-md p-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  className="transition-transform duration-200 group-hover:rotate-90"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <nav className="flex flex-col gap-3 pt-5">
              {NAV_LINKS.map((link, idx) => (
                <div key={link.href} className="overflow-hidden">
                  <Link
                    href={link.href}
                    onClick={() => setIsMenuOpen(false)}
                    className="mobile-nav-link group flex items-baseline justify-between font-sans text-xl font-semibold tracking-tight text-stone-800 transition-colors hover:text-[#487aa8]"
                  >
                    <span className="inline-block transform-gpu transition-transform duration-200 group-hover:translate-x-1.5">
                      {link.label}
                    </span>
                    <span className="font-mono text-[11px] font-normal text-stone-400 group-hover:text-[#487aa8]">
                      0{idx + 1}
                    </span>
                  </Link>
                </div>
              ))}
            </nav>
          </div>

          <div className="mobile-menu-footer pt-5 border-t border-stone-100 flex flex-col gap-2.5">
            <Link
              href="/login"
              onClick={() => setIsMenuOpen(false)}
              className="text-xs font-medium text-stone-500 hover:text-stone-900 text-center py-1 transition-colors"
            >
              Sign In
            </Link>

            <Link
              href="/register"
              onClick={() => setIsMenuOpen(false)}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#487aa8] hover:bg-[#3b668f] py-2.5 text-xs font-semibold text-white shadow-2xs transition-all active:scale-95"
            >
              <span>Create workspace</span>
              <span>↗</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
