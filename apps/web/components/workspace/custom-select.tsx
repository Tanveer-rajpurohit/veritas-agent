"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDownIcon, CheckIcon } from "./workspace-icons";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
  badge?: string;
}

interface CustomSelectProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  className?: string;
}

export function CustomSelect<T extends string = string>({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  className = "",
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function handleSelect(optionValue: T) {
    onChange(optionValue);
    setIsOpen(false);
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${isOpen ? "z-50" : "z-10"} ${className}`}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex h-10 w-full items-center justify-between rounded-lg border bg-white px-3.5 text-xs text-stone-900 shadow-2xs transition-all outline-none cursor-pointer ${
          isOpen
            ? "border-[#487aa8] ring-3 ring-[#487aa8]/10"
            : "border-stone-200/90 hover:border-stone-300"
        }`}
      >
        <span className="truncate font-medium text-left">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDownIcon
          size={13}
          className={`shrink-0 text-stone-400 transition-transform duration-200 ml-2 ${
            isOpen ? "rotate-180 text-[#487aa8]" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-52 overflow-y-auto rounded-xl border border-stone-200/90 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-100">
          <div className="flex flex-col gap-0.5">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-[#edf4fa] font-semibold text-[#2c5478]"
                      : "text-stone-700 hover:bg-[#f5f8fa] hover:text-stone-900"
                  }`}
                >
                  <div className="flex min-w-0 flex-col pr-2">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{opt.label}</span>
                      {opt.badge && (
                        <span className="rounded-xs bg-stone-100 px-1.5 py-0.5 font-mono text-[9.5px] text-stone-500 font-normal">
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    {opt.description && (
                      <span className="truncate text-[11px] font-normal text-stone-400 pt-0.5">
                        {opt.description}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <CheckIcon size={12} className="shrink-0 text-[#487aa8]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
