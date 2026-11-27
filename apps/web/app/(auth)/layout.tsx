import type { ReactNode } from "react";
import { Orb } from "@veritas/ui";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";

const APPS = ["Docs", "Sheets", "Slides", "PDF"];

export default async function AuthLayout({ children }: { children: ReactNode }) {
  if (await getSessionUser()) redirect("/");

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside
        data-theme="dark"
        className="relative hidden flex-col justify-between overflow-hidden bg-canvas p-12 text-ink lg:flex"
        aria-label="About Veritas"
      >
        <div className="flex items-center gap-3">
          <Orb size={28} />
          <span className="text-lg font-semibold tracking-tight">Veritas</span>
        </div>

        <div className="flex flex-col gap-12">
          <Orb size={280} className="self-center" />
          <div className="flex max-w-md flex-col gap-4">
            <h2 className="text-4xl leading-tight font-semibold tracking-tight">Every document you work on, in one place.</h2>
            <p className="text-lg text-ink-muted">
              Write, calculate and present in one app. Your agent reads your files, makes the edits you ask for, and shows
              where every answer came from.
            </p>
          </div>
        </div>

        <ul className="flex flex-wrap gap-2" aria-label="Included apps">
          {APPS.map((app) => (
            <li key={app} className="rounded-full border border-line px-3 py-1 text-sm text-ink-muted">
              {app}
            </li>
          ))}
        </ul>
      </aside>

      <main id="main" className="flex flex-col bg-canvas px-4 py-8 sm:px-8">
        <div className="flex items-center gap-2 lg:hidden">
          <Orb size={24} />
          <span className="font-semibold tracking-tight">Veritas</span>
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">{children}</div>
      </main>
    </div>
  );
}
