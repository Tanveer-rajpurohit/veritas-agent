"use client";

import { useState } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  TimerIcon,
  CheckIcon,
} from "../workspace/workspace-icons";
import { ThinkingOrb } from "./thinking-orb";

export interface AgentStep {
  id: string;
  label: string;
  detail?: string;
  status: "completed" | "in_progress" | "pending";
}

interface AgentThinkingProps {
  durationSeconds?: number;
  isThinking?: boolean;
  thoughtSummary?: string;
  steps?: AgentStep[];
  detailedThought?: string;
  defaultExpanded?: boolean;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "1s";
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function AgentThinking({
  durationSeconds = 3.4,
  isThinking = false,
  thoughtSummary,
  steps = [],
  detailedThought,
  defaultExpanded = false,
}: AgentThinkingProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="w-full my-2.5 font-sans select-none">
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-2 text-xs font-medium text-stone-500 hover:text-[#487aa8] transition-colors py-0.5 cursor-pointer w-fit"
          aria-expanded={expanded}
        >
          <ThinkingOrb size={15} isThinking={isThinking} />
          <span>
            {isThinking
              ? "Thinking..."
              : `Thought for ${formatDuration(durationSeconds)}`}
          </span>
          <span className="text-stone-400">
            {expanded ? (
              <ChevronDownIcon size={12} />
            ) : (
              <ChevronRightIcon size={12} />
            )}
          </span>
        </button>

        {thoughtSummary && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-left text-xs text-stone-600 hover:text-stone-900 transition-colors cursor-pointer w-fit py-0.5"
          >
            <TimerIcon size={13} className="text-stone-400 shrink-0" />
            <span className="leading-snug truncate max-w-[540px]">
              {thoughtSummary}
            </span>
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-2.5 pl-3.5 ml-1.5 border-l border-stone-200 space-y-2.5">
          {steps.length > 0 && (
            <div className="space-y-1.5 pt-0.5">
              {steps.map((step) => (
                <div key={step.id} className="flex items-start gap-2 text-xs">
                  {step.status === "completed" ? (
                    <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <CheckIcon size={9} />
                    </span>
                  ) : step.status === "in_progress" ? (
                    <div className="mt-0.5 shrink-0">
                      <div className="h-3.5 w-3.5 rounded-full border-2 border-[#487aa8] border-t-transparent animate-spin" />
                    </div>
                  ) : (
                    <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-stone-300" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`leading-tight ${
                        step.status === "completed"
                          ? "text-stone-700 font-medium"
                          : step.status === "in_progress"
                            ? "text-[#2c5478] font-semibold"
                            : "text-stone-400"
                      }`}
                    >
                      {step.label}
                    </p>
                    {step.detail && (
                      <p className="text-[11px] text-stone-400 mt-0.5 font-mono">
                        {step.detail}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {detailedThought && (
            <div className="pt-1 text-xs text-stone-600 leading-relaxed whitespace-pre-line font-mono bg-[#f8fafc] p-3 rounded-md border border-stone-200/90 shadow-2xs">
              {detailedThought}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
