import type { ReactNode } from "react";
import { cx } from "./cx";

type IconProps = { className?: string };

/** 24px grid, 1.5px stroke, round joins. Decorative: the control carries the name. */
function Icon({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cx("size-6 shrink-0", className)}
    >
      {children}
    </svg>
  );
}

export function DocsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
    </Icon>
  );
}

export function SheetsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 9.5h16M4 14.5h16M9.5 4v16" />
    </Icon>
  );
}

export function SlidesIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="12.5" rx="2" />
      <path d="M12 16.5V20M8.5 20h7" />
    </Icon>
  );
}

/** A page with a turned corner and a signature stroke: read, mark up, sign. */
export function PdfIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M8.5 16c1.2-2.6 2.2-2.6 2.8 0 .5 2 1.5 2 2.7-.4.4-.8 1-.9 1.5-.1" />
    </Icon>
  );
}

export function FilesIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 7.5a2 2 0 0 1 2-2h3.6l2 2h7.4a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
    </Icon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h8.5M17.5 7H20M4 17h2.5M11.5 17H20" />
      <circle cx="15" cy="7" r="2.5" />
      <circle cx="9" cy="17" r="2.5" />
    </Icon>
  );
}

export function SignOutIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 8l-4 4 4 4M6 12h9" />
    </Icon>
  );
}
