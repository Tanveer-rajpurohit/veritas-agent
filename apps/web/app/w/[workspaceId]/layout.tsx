import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { desktopList, workspaceList } from "@veritas/shared";
import { DesktopShell } from "@/components/desktop/desktop-shell";
import { desktopCookieName } from "@/components/desktop/desktop-cookie";
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

  const [{ desktops }, cookieStore] = await Promise.all([
    apiGet(`/api/v1/workspaces/${workspaceId}/desktops`, desktopList),
    cookies(),
  ]);
  const remembered = cookieStore.get(desktopCookieName(workspaceId))?.value;
  const currentDesktopId = desktops.find((d) => d.id === remembered)?.id ?? desktops[0]!.id;

  return (
    <>
      <DesktopShell
        workspaceId={workspaceId}
        workspaceName={workspace.name}
        user={{ name: user.name, email: user.email }}
        desktops={desktops}
        currentDesktopId={currentDesktopId}
      />
      {children}
    </>
  );
}
