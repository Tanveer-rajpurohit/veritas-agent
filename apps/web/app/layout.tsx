import type { Metadata, Viewport } from "next";
import { PT_Mono, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import { THEME_INIT_SCRIPT } from "@veritas/ui";
import "./globals.css";

// Both faces are SIL Open Font License (free for commercial use).
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk", display: "swap" });
const ptMono = PT_Mono({ subsets: ["latin"], weight: "400", variable: "--font-pt-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Veritas", template: "%s · Veritas" },
  description: "Your documents, sheets, slides and PDFs in one place, with an AI agent that works across all of them.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f0eee9" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0a09" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${ptMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-canvas text-ink">{children}</body>
    </html>
  );
}
