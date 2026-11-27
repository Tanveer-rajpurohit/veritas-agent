import type { Metadata } from "next";
import { workspaceList } from "@veritas/shared";
import { apiGet } from "@/lib/api-server";

export const metadata: Metadata = { title: "Home" };

export default async function WorkspaceHomePage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  const { workspaces } = await apiGet("/api/v1/workspaces", workspaceList);
  const workspace = workspaces.find((w) => w.id === workspaceId);

  return (
    <div className="flex flex-col gap-2 px-6 py-8 sm:px-8">
      <p className="font-mono text-xs tracking-wide text-ink-muted uppercase">Home</p>
      <h1 className="text-3xl font-semibold tracking-tight">{workspace?.name}</h1>
    </div>
  );
}
