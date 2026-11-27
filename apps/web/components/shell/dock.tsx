"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { Orb } from "@veritas/ui";
import { APPS } from "@/lib/apps";

/** The app switcher along the bottom of the workspace, as in the wireframe. */
export function Dock({ workspaceId }: { workspaceId: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Apps" className="flex shrink-0 justify-center px-2 pt-2 pb-3">
      <ul className="flex items-center gap-1 rounded-2xl border border-line bg-surface p-1.5 shadow-raised">
        {APPS.map((app) => {
          const href = `/w/${workspaceId}/${app.id}`;
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          const Icon = app.icon;
          return (
            <Fragment key={app.id}>
              {app.id === "agent" ? <li aria-hidden className="mx-1 h-6 w-px bg-line" /> : null}
              <li>
                <Link
                  href={href}
                  aria-label={app.label}
                  aria-current={isActive ? "page" : undefined}
                  className="group relative flex size-11 items-center justify-center rounded-xl text-ink-muted transition-[background-color,color,transform] duration-150 ease-out-soft hover:bg-surface-hover hover:text-ink active:scale-[0.96] aria-[current=page]:bg-surface-selected aria-[current=page]:text-ink"
                >
                  {Icon ? <Icon /> : <Orb size={24} />}
                  <span
                    aria-hidden
                    className="absolute bottom-1 size-1 rounded-full bg-ink opacity-0 transition-opacity duration-150 group-aria-[current=page]:opacity-100"
                  />
                  <span
                    aria-hidden
                    data-dock-tooltip
                    className="pointer-events-none invisible absolute bottom-full mb-2 translate-y-1 rounded-md bg-surface-inverted px-2 py-1 text-xs font-medium whitespace-nowrap text-ink-inverted opacity-0 shadow-overlay transition-[opacity,transform,visibility] duration-150 ease-out-soft group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-hover:delay-300 group-focus-visible:visible group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
                  >
                    {app.label}
                  </span>
                </Link>
              </li>
            </Fragment>
          );
        })}
      </ul>
    </nav>
  );
}
