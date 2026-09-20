import "./globals.css";
import "blobatar/motion.css";
import type { Metadata, Viewport } from "next";
import { fontMono, fontSans, fontSerif } from "./fonts";
import { QueryProvider } from "../providers/QueryProvider";
import { AuthProvider } from "../providers/AuthProvider";

export const metadata: Metadata = {
  applicationName: "Veritas",
  title: {
    default: "Veritas legal drafting workspace",
    template: "%s · Veritas",
  },
  description:
    "Draft legal documents and verify every claim against its source in a workspace built for Indian lawyers.",
  category: "legal technology",
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#ffffff",
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
      <body className="font-sans antialiased overflow-x-hidden">
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
