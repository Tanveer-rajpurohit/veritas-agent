import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Matter Workspace",
  description:
    "Review matter documents and drafts with their supporting evidence in Veritas.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return children;
}
