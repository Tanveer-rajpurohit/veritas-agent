import { redirect } from "next/navigation";
import { workspaceList } from "@veritas/shared";
import { apiGet } from "@/lib/api-server";
import { getSessionUser } from "@/lib/session";

export default async function RootPage() {
  if (!(await getSessionUser())) redirect("/sign-in");
  const { workspaces } = await apiGet("/api/v1/workspaces", workspaceList);
  const first = workspaces[0];
  redirect(first ? `/w/${first.id}` : "/onboarding");
}
