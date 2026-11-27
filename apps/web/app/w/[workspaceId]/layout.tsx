import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { workspaceList } from "@veritas/shared";
import { Orb } from "@veritas/ui";
import { AccountMenu } from "@/components/shell/account-menu";
import { Dock } from "@/components/shell/dock";
import { apiGet } from "@/lib/api-server";
import { requireUser } from "@/lib/session";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const user = await requireUser();
  const { workspaceId } = await params;
  const { workspaces } = await apiGet("/api/v1/workspaces", workspaceList);
  const workspace = workspaces.find((w) => w.id === workspaceId);
  if (!workspace) notFound();

  return (
    <div className="flex h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-surface-inverted focus:px-4 focus:py-2 focus:text-sm focus:text-ink-inverted"
      >
        Skip to content
      </a>
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 pr-1 pl-4">
        <Link
          href={`/w/${workspaceId}`}
          className="flex min-w-0 items-center gap-3 rounded-lg py-2 pr-2 text-sm font-semibold transition-colors duration-150 hover:text-accent-text"
        >
          <Orb size={24} />
          <span className="truncate">{workspace.name}</span>
        </Link>
        <AccountMenu name={user.name} email={user.email} workspaceId={workspaceId} />
      </header>
      <main id="main" className="min-h-0 flex-1 px-2 sm:px-3">
        <div className="h-full overflow-auto rounded-2xl border border-line bg-surface shadow-raised">{children}</div>
      </main>
      <Dock workspaceId={workspaceId} />
    </div>
  );
}
