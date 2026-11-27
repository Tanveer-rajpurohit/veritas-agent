import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Orb } from "@veritas/ui";
import { findApp } from "@/lib/apps";

type Props = { params: Promise<{ workspaceId: string; app: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const app = findApp((await params).app);
  return { title: app?.label ?? "Not found" };
}

/** Each app's window until its editor lands; real app routes take precedence over this segment. */
export default async function AppWindowPage({ params }: Props) {
  const app = findApp((await params).app);
  if (!app) notFound();
  const Icon = app.icon;

  return (
    <section aria-labelledby="app-title" className="flex h-full min-h-80 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-6">
        {Icon ? <Icon className="size-5 text-ink-muted" /> : <Orb size={20} />}
        <h1 id="app-title" className="text-base font-semibold">
          {app.label}
        </h1>
      </header>
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="flex max-w-sm flex-col items-center gap-2 text-center">
          <p className="text-lg font-semibold">{app.emptyTitle}</p>
          <p className="text-sm text-ink-muted">{app.emptyBody}</p>
        </div>
      </div>
    </section>
  );
}
