"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { cx, SettingsIcon, SignOutIcon } from "@veritas/ui";
import { authClient } from "@/lib/auth-client";
import { AppLink } from "../desktop/app-link";
import { ThemeSwitch } from "../theme-switch";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0]![0]! + parts.at(-1)![0]! : (parts[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

type Props = {
  name: string;
  email: string;
  /** "sidebar": a full-width row at the foot of the sidebar that opens upward. "header": an avatar in the top bar. */
  placement?: "header" | "sidebar";
};

/** Native popover: light dismiss and Escape come from the platform. */
export function AccountMenu({ name, email, placement = "header" }: Props) {
  // Both placements can be mounted at once (one hidden by breakpoint), so ids must be unique.
  const menuId = useId();
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
      {placement === "sidebar" ? (
        <button
          type="button"
          popoverTarget={menuId}
          aria-label="Account"
          className="flex h-12 w-full min-w-0 items-center gap-3 rounded-lg px-2 text-left transition-[background-color,transform] duration-150 ease-out-soft hover:bg-surface/70 active:scale-[0.98]"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface font-mono text-xs text-ink">
            {initials(name)}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium text-ink">{name}</span>
            <span className="truncate text-xs text-ink-muted">{email}</span>
          </span>
        </button>
      ) : (
        <button
          type="button"
          popoverTarget={menuId}
          aria-label="Account"
          className="flex size-11 items-center justify-center rounded-full transition-transform duration-150 ease-out-soft active:scale-[0.96]"
        >
          <span className="flex size-9 items-center justify-center rounded-full border border-line bg-surface-muted font-mono text-xs text-ink">
            {initials(name)}
          </span>
        </button>
      )}

      <div
        id={menuId}
        ref={menuRef}
        popover="auto"
        aria-label="Account"
        className={cx(
          "inset-auto m-0 w-72 rounded-xl border border-line bg-surface-raised p-2 text-ink shadow-overlay",
          placement === "sidebar" ? "bottom-18 left-3" : "top-14 right-3",
        )}
      >
        <div className="flex flex-col gap-0.5 px-3 pt-2 pb-3">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="truncate text-sm text-ink-muted">{email}</p>
        </div>
        <div className="border-t border-line px-3 py-3">
          <ThemeSwitch />
        </div>
        <div className="flex flex-col gap-0.5 border-t border-line pt-2">
          <AppLink app="settings" onClick={() => menuRef.current?.hidePopover()} className={itemClass}>
            <SettingsIcon className="size-5 text-ink-muted" />
            Settings
          </AppLink>
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
