import type { Metadata } from "next";
import { workspaceList } from "@veritas/shared";
import { apiGet } from "@/lib/api-server";

export const metadata: Metadata = { title: "Home" };

export default async function WorkspaceHomePage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  const { workspaces } = await apiGet("/api/v1/workspaces", workspaceList);
  const workspace = workspaces.find((w) => w.id === workspaceId);

  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-2 px-4 py-12">
      <p className="text-sm text-ink-muted">Home</p>
      <h1 className="text-3xl font-semibold tracking-tight">{workspace?.name}</h1>
    </main>
  );
}
