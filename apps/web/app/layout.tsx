import "./globals.css";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";

export const metadata: Metadata = {
  title: {
    default: "Veritas — Draft with the evidence beside you",
    template: "%s · Veritas",
  },
  description: "Evidence-first legal drafting and review workspace for Indian lawyers.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={GeistSans.className}>{children}</body>
    </html>
  );
}
