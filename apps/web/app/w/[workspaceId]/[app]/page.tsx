import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findApp } from "@/lib/apps";

type Props = { params: Promise<{ workspaceId: string; app: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const app = findApp((await params).app);
  return { title: app?.label ?? "Not found" };
}

/** The desktop (in the layout) opens the app named here; unknown names are a 404. */
export default async function AppRoutePage({ params }: Props) {
  const app = findApp((await params).app);
  if (!app || app.id === "home") notFound();
  return null;
}
