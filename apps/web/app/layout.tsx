import "./globals.css";
import type { Metadata } from "next";
import { fontMono, fontSans, fontSerif } from "./fonts";

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
    <html
      lang="en"
      className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} overflow-x-hidden`}
    >
      <body className="font-sans antialiased overflow-x-hidden">{children}</body>
    </html>
  );
}

