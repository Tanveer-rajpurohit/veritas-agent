"use client";

import React from "react";

export type FileCategory =
  | "Pleadings"
  | "Evidence"
  | "Orders"
  | "Contracts"
  | "Statute"
  | "Draft"
  | "Finance"
  | "Generic";

export type FileFormat = "PDF" | "XLSX" | "XLS" | "DOCX" | "DOC" | "CSV" | "TXT" | "MD" | "JSON";

export type IconSize = "xs" | "sm" | "md" | "lg";

export interface ColoredFileIconProps {
  filename?: string;
  format?: FileFormat | string;
  category?: FileCategory | string;
  size?: IconSize;
  className?: string;
}

interface FileTheme {
  bg: string;
  border: string;
  fold: string;
  accent: string;
  lineColor: string;
}

type ThemeKey =
  | "pdf"
  | "xlsx"
  | "docx"
  | "orders"
  | "contracts"
  | "evidence"
  | "statute"
  | "draft"
  | "generic";

const THEMES: Record<ThemeKey, FileTheme> = {
  draft: {
    bg: "#edf4fa",
    border: "#cbe0f2",
    fold: "#dbe9f5",
    accent: "#487aa8",
    lineColor: "#487aa8",
  },
  docx: {
    bg: "#f0f6ff",
    border: "#c7dcfa",
    fold: "#dbeafe",
    accent: "#2563eb",
    lineColor: "#3b82f6",
  },
  pdf: {
    bg: "#fef2f2",
    border: "#fecaca",
    fold: "#fee2e2",
    accent: "#dc2626",
    lineColor: "#ef4444",
  },
  xlsx: {
    bg: "#f0fdf4",
    border: "#bbf7d0",
    fold: "#dcfce7",
    accent: "#16a34a",
    lineColor: "#22c55e",
  },
  orders: {
    bg: "#faf5ff",
    border: "#e9d5ff",
    fold: "#f3e8ff",
    accent: "#7c3aed",
    lineColor: "#8b5cf6",
  },
  contracts: {
    bg: "#fffbeb",
    border: "#fde68a",
    fold: "#fef3c7",
    accent: "#d97706",
    lineColor: "#f59e0b",
  },
  evidence: {
    bg: "#ecfeff",
    border: "#a5f3fc",
    fold: "#cffafe",
    accent: "#0891b2",
    lineColor: "#06b6d4",
  },
  statute: {
    bg: "#fff7ed",
    border: "#fed7aa",
    fold: "#ffedd5",
    accent: "#ea580c",
    lineColor: "#f97316",
  },
  generic: {
    bg: "#f8fafc",
    border: "#e2e8f0",
    fold: "#f1f5f9",
    accent: "#64748b",
    lineColor: "#94a3b8",
  },
};

const SIZE_CONFIG: Record<
  IconSize,
  {
    w: number;
    h: number;
    fold: number;
    radius: number;
    strokeWidth: number;
  }
> = {
  xs: {
    w: 16,
    h: 20,
    fold: 5,
    radius: 2.5,
    strokeWidth: 1,
  },
  sm: {
    w: 22,
    h: 28,
    fold: 6.5,
    radius: 3,
    strokeWidth: 1.1,
  },
  md: {
    w: 32,
    h: 40,
    fold: 9,
    radius: 4.5,
    strokeWidth: 1.3,
  },
  lg: {
    w: 42,
    h: 52,
    fold: 12,
    radius: 6,
    strokeWidth: 1.5,
  },
};

function resolveTheme(
  filename?: string,
  format?: string,
  category?: string,
): { theme: FileTheme; key: ThemeKey } {
  const normFormat = (format || "").toUpperCase();
  const normCat = (category || "").toLowerCase();
  const lowerFile = (filename || "").toLowerCase();

  if (normCat.includes("draft") || normCat.includes("brief") || normCat.includes("memo")) {
    return { theme: THEMES.draft, key: "draft" };
  }
  if (normFormat === "PDF" || lowerFile.endsWith(".pdf")) {
    return { theme: THEMES.pdf, key: "pdf" };
  }
  if (
    normFormat === "XLSX" ||
    normFormat === "XLS" ||
    normFormat === "CSV" ||
    lowerFile.endsWith(".xlsx") ||
    lowerFile.endsWith(".xls") ||
    lowerFile.endsWith(".csv") ||
    normCat.includes("finance") ||
    normCat.includes("ledger")
  ) {
    return { theme: THEMES.xlsx, key: "xlsx" };
  }
  if (
    normFormat === "DOCX" ||
    normFormat === "DOC" ||
    lowerFile.endsWith(".docx") ||
    lowerFile.endsWith(".doc") ||
    normCat.includes("pleading")
  ) {
    return { theme: THEMES.docx, key: "docx" };
  }
  if (normCat.includes("order") || normCat.includes("decree") || normCat.includes("judgment")) {
    return { theme: THEMES.orders, key: "orders" };
  }
  if (normCat.includes("contract") || normCat.includes("agreement")) {
    return { theme: THEMES.contracts, key: "contracts" };
  }
  if (normCat.includes("evidence") || normCat.includes("exhibit")) {
    return { theme: THEMES.evidence, key: "evidence" };
  }
  if (normCat.includes("statute") || normCat.includes("act")) {
    return { theme: THEMES.statute, key: "statute" };
  }

  return { theme: THEMES.generic, key: "generic" };
}

export function ColoredFileIcon({
  filename,
  format,
  category,
  size = "sm",
  className = "",
}: ColoredFileIconProps) {
  const { theme, key } = resolveTheme(filename, format, category);
  const cfg = SIZE_CONFIG[size];

  const w = cfg.w;
  const h = cfg.h;
  const f = cfg.fold;
  const r = cfg.radius;
  const stroke = cfg.strokeWidth;

  const bodyPath = `
    M ${r},0
    L ${w - f},0
    L ${w},${f}
    L ${w},${h - r}
    A ${r},${r} 0 0 1 ${w - r},${h}
    L ${r},${h}
    A ${r},${r} 0 0 1 0,${h - r}
    L 0,${r}
    A ${r},${r} 0 0 1 ${r},0
    Z
  `;

  const foldPath = `
    M ${w - f},0
    L ${w - f},${f}
    L ${w},${f}
    Z
  `;

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 select-none transition-transform hover:scale-[1.03] ${className}`}
      style={{
        width: w,
        height: h,
      }}
      aria-hidden="true"
    >
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d={bodyPath}
          fill={theme.bg}
          stroke={theme.border}
          strokeWidth={stroke}
          strokeLinejoin="round"
        />

        <path
          d={foldPath}
          fill={theme.fold}
          stroke={theme.border}
          strokeWidth={stroke}
          strokeLinejoin="round"
        />

        {key === "pdf" ? (
          <g transform={`translate(${w * 0.22}, ${h * 0.42}) scale(${w / 34})`}>
            <path
              d="M1 2.5h11M1 6.5h8M1 10.5h10"
              stroke={theme.accent}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <rect
              x="0"
              y="13"
              width="14"
              height="6.5"
              rx="1.5"
              fill={theme.accent}
            />
            <text
              x="7"
              y="18"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="5"
              fontWeight="bold"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              PDF
            </text>
          </g>
        ) : key === "xlsx" ? (
          <g transform={`translate(${w * 0.22}, ${h * 0.36}) scale(${w / 32})`}>
            <rect
              x="0"
              y="0"
              width="14"
              height="14"
              rx="1.5"
              stroke={theme.accent}
              strokeWidth="1.2"
            />
            <line x1="0" y1="5" x2="14" y2="5" stroke={theme.accent} strokeWidth="1" />
            <line x1="0" y1="9.5" x2="14" y2="9.5" stroke={theme.accent} strokeWidth="1" />
            <line x1="7" y1="0" x2="7" y2="14" stroke={theme.accent} strokeWidth="1" />
          </g>
        ) : (
          <g
            stroke={theme.lineColor}
            strokeWidth={stroke * 0.9}
            strokeLinecap="round"
          >
            <line
              x1={w * 0.24}
              y1={h * 0.35}
              x2={w * 0.58}
              y2={h * 0.35}
            />
            <line
              x1={w * 0.24}
              y1={h * 0.50}
              x2={w * 0.76}
              y2={h * 0.50}
            />
            <line
              x1={w * 0.24}
              y1={h * 0.65}
              x2={w * 0.68}
              y2={h * 0.65}
            />
            <line
              x1={w * 0.24}
              y1={h * 0.80}
              x2={w * 0.48}
              y2={h * 0.80}
            />
          </g>
        )}
      </svg>
    </div>
  );
}
