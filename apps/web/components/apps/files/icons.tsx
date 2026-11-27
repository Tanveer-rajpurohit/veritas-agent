import type { FilesEntry } from "@veritas/shared";
import { cx, DocsIcon, PdfIcon, SheetsIcon, SlidesIcon } from "@veritas/ui";
import type { ReactNode } from "react";

type IconProps = { className?: string };

/** Same grid and stroke as the dock icons in @veritas/ui. */
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

export function FolderIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 7.5a2 2 0 0 1 2-2h3.6l2 2h7.4a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z" />
    </Icon>
  );
}

export function GenericFileIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5Z" />
      <path d="M13.5 3v5.5H19" />
    </Icon>
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="6" cy="12" r="0.75" fill="currentColor" />
      <circle cx="12" cy="12" r="0.75" fill="currentColor" />
      <circle cx="18" cy="12" r="0.75" fill="currentColor" />
    </Icon>
  );
}

export function EntryIcon({ entry, className }: { entry: FilesEntry; className?: string }) {
  if (entry.type === "folder") return <FolderIcon className={className} />;
  switch (entry.kind) {
    case "doc":
      return <DocsIcon className={className} />;
    case "sheet":
      return <SheetsIcon className={className} />;
    case "slides":
      return <SlidesIcon className={className} />;
    case "pdf":
      return <PdfIcon className={className} />;
    default:
      return <GenericFileIcon className={className} />;
  }
}
