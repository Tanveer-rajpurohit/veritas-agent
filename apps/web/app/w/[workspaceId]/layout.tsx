import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { workspaceList } from "@veritas/shared";
import { apiGet } from "@/lib/api-server";
import { requireUser } from "@/lib/session";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  await requireUser();
  const { workspaceId } = await params;
  const { workspaces } = await apiGet("/api/v1/workspaces", workspaceList);
  if (!workspaces.some((w) => w.id === workspaceId)) notFound();
  return <>{children}</>;
}
