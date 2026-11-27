"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";

/** Google's own mark, as its sign-in branding guidelines require. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="size-5 shrink-0">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export function GoogleButton() {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState("");

  const start = async () => {
    setIsRedirecting(true);
    setError("");
    // New accounts land on onboarding through "/", returning ones on their workspace.
    const { error: err } = await authClient.signIn.social({ provider: "google", callbackURL: "/", errorCallbackURL: "/sign-in?error=google" });
    if (err) {
      setIsRedirecting(false);
      setError(authErrorMessage(err));
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={start}
        disabled={isRedirecting}
        aria-busy={isRedirecting || undefined}
        className="inline-flex h-12 items-center justify-center gap-3 rounded-lg border border-line-strong bg-surface px-6 text-base font-semibold text-ink transition-[background-color,transform] duration-150 ease-out-soft hover:bg-surface-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <GoogleMark />
        {isRedirecting ? "Opening Google…" : "Continue with Google"}
      </button>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-4 text-sm text-ink-subtle" aria-hidden>
      <span className="h-px flex-1 bg-line" />
      or
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
