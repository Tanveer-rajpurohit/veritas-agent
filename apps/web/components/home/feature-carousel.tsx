"use client";

import { useEffect, useRef, useState } from "react";

interface FeatureCardProps {
  title: string;
  description: string;
  isActive: boolean;
  progress: number;
  onClick: () => void;
}

function FeatureCard({
  title,
  description,
  isActive,
  progress,
  onClick,
}: FeatureCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`group flex-1 overflow-hidden flex flex-col justify-start items-start text-left transition-colors duration-200 cursor-pointer border-b md:border-b-0 md:border-r border-stone-200 last:border-0 ${
        isActive ? "bg-stone-50/80" : "bg-transparent hover:bg-stone-50/40"
      }`}
    >
      <span
        aria-hidden="true"
        className={`w-full h-1 bg-stone-200/50 overflow-hidden transition-opacity ${
          isActive ? "opacity-100" : "opacity-0"
        }`}
      >
        <span
          className="block h-1 bg-[#487aa8] transition-[width] duration-100"
          style={{ width: `${progress}%` }}
        />
      </span>
      <span className="px-5 py-4 w-full flex flex-col gap-1.5">
        <span className="self-stretch text-stone-900 text-sm font-semibold leading-5 font-sans transition-colors group-hover:text-[#487aa8]">
          {title}
        </span>
        <span className="self-stretch text-stone-600 text-[12px] font-normal leading-[19px] font-sans whitespace-pre-line">
          {description}
        </span>
      </span>
    </button>
  );
}

export function FeatureCarousel() {
  const [activeCard, setActiveCard] = useState(0);
  const [progress, setProgress] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const progressInterval = setInterval(() => {
      if (!mountedRef.current) return;

      setProgress((prev) => {
        if (prev >= 100) {
          if (mountedRef.current) {
            setActiveCard((current) => (current + 1) % 3);
          }
          return 0;
        }
        return prev + 2;
      });
    }, 100);

    return () => {
      clearInterval(progressInterval);
      mountedRef.current = false;
    };
  }, []);

  const handleCardClick = (index: number) => {
    if (!mountedRef.current) return;
    setActiveCard(index);
    setProgress(0);
  };

  return (
    <section className="w-full border-b border-stone-200 flex justify-center bg-white">
      <div className="w-full max-w-6xl lg:max-w-7xl mx-auto flex flex-col md:flex-row border-x border-stone-200">
        <FeatureCard
          title="Document Discrepancy Spotting"
          description="Pinpoint conflicting default amounts and interest dates across loan agreements and demand notices instantly."
          isActive={activeCard === 0}
          progress={activeCard === 0 ? progress : 0}
          onClick={() => handleCardClick(0)}
        />
        <FeatureCard
          title="4-Axis Citation Verification"
          description="Test precedent existence, verbatim quotes, proposition support, and good-law validity before filing in court."
          isActive={activeCard === 1}
          progress={activeCard === 1 ? progress : 0}
          onClick={() => handleCardClick(1)}
        />
        <FeatureCard
          title="Automatic Reset on Revision"
          description="Every edited sentence resets approvals automatically so you never file an unverified or invalidated citation in court."
          isActive={activeCard === 2}
          progress={activeCard === 2 ? progress : 0}
          onClick={() => handleCardClick(2)}
        />
      </div>
    </section>
  );
}
