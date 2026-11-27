import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DesignFoundations } from "@/components/design-foundations";

export const metadata: Metadata = { title: "Design foundations" };

// Developer reference for the live tokens. Not available in production builds.
export default function DesignPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DesignFoundations />;
}
