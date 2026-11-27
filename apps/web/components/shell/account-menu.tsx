"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { SettingsIcon, SignOutIcon } from "@veritas/ui";
import { authClient } from "@/lib/auth-client";
import { ThemeSwitch } from "../theme-switch";

const MENU_ID = "account-menu";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0]![0]! + parts.at(-1)![0]! : (parts[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

type Props = { name: string; email: string; workspaceId: string };

/** Native popover: light dismiss and Escape come from the platform. */
export function AccountMenu({ name, email, workspaceId }: Props) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState("");

  const signOut = async () => {
    setIsSigningOut(true);
    setError("");
    const { error: err } = await authClient.signOut();
    if (err) {
      setIsSigningOut(false);
      setError("We couldn't sign you out. Check your connection and try again.");
      return;
    }
    router.replace("/sign-in");
  };

  const itemClass =
    "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-ink transition-colors duration-150 ease-out-soft hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <>
      <button
        type="button"
        popoverTarget={MENU_ID}
        aria-label="Account"
        className="flex size-11 items-center justify-center rounded-full transition-transform duration-150 ease-out-soft active:scale-[0.96]"
      >
        <span className="flex size-9 items-center justify-center rounded-full border border-line bg-surface-muted font-mono text-xs text-ink">
          {initials(name)}
        </span>
      </button>

      <div
        id={MENU_ID}
        ref={menuRef}
        popover="auto"
        aria-label="Account"
        className="inset-auto top-14 right-3 m-0 w-72 rounded-xl border border-line bg-surface-raised p-2 text-ink shadow-overlay"
      >
        <div className="flex flex-col gap-0.5 px-3 pt-2 pb-3">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="truncate text-sm text-ink-muted">{email}</p>
        </div>
        <div className="border-t border-line px-3 py-3">
          <ThemeSwitch />
        </div>
        <div className="flex flex-col gap-0.5 border-t border-line pt-2">
          <Link href={`/w/${workspaceId}/settings`} onClick={() => menuRef.current?.hidePopover()} className={itemClass}>
            <SettingsIcon className="size-5 text-ink-muted" />
            Settings
          </Link>
          <button type="button" onClick={signOut} disabled={isSigningOut} className={itemClass}>
            <SignOutIcon className="size-5 text-ink-muted" />
            {isSigningOut ? "Signing out…" : "Sign out"}
          </button>
          {error ? (
            <p role="alert" className="px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </>
  );
}
