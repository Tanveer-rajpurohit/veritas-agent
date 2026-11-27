import type { Metadata } from "next";
import { Orb } from "@veritas/ui";
import { requireUser } from "@/lib/session";
import { WorkspaceForm } from "./workspace-form";

export const metadata: Metadata = { title: "Name your workspace" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const firstName = user.name.split(" ")[0] || user.name;

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-4 py-12">
      <Orb size={64} />
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome to Veritas, {firstName}</h1>
        <p className="text-base text-ink-muted">
          Your email is confirmed. Name your workspace: it holds your files, your agent conversations and the people you work
          with.
        </p>
      </div>
      <WorkspaceForm suggestedName="" />
    </main>
  );
}
