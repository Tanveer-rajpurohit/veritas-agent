"use client";

import { useState } from "react";
import { Button } from "@veritas/ui";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";

type Props = { email: string; title?: string; intro?: string };

/** Shown after sign-up, and when someone tries to sign in before confirming. */
export function CheckInbox({ email, title = "Check your inbox", intro }: Props) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const resend = async () => {
    setStatus("sending");
    const { error: err } = await authClient.sendVerificationEmail({ email, callbackURL: "/onboarding" });
    if (err) {
      setError(authErrorMessage(err));
      setStatus("error");
      return;
    }
    setStatus("sent");
  };

  return (
    <section aria-labelledby="check-inbox-title" className="flex flex-col gap-6">
      <div className="flex size-12 items-center justify-center rounded-xl border border-line bg-surface-muted" aria-hidden>
        <svg viewBox="0 0 24 24" className="size-6 text-ink" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      </div>
      <div className="flex flex-col gap-2">
        <h1 id="check-inbox-title" className="text-3xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="text-base text-ink-muted">
          {intro ?? "We sent a confirmation link to"} <span className="font-medium text-ink">{email}</span>. Open it to
          finish setting up your account. The link works for 24 hours.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <Button variant="secondary" size="lg" onClick={resend} isLoading={status === "sending"} loadingLabel="Sending…">
          Resend the email
        </Button>
        <p role="status" aria-live="polite" className="min-h-5 text-sm">
          {status === "sent" ? <span className="text-success">Sent. It can take a minute to arrive.</span> : null}
          {status === "error" ? <span className="text-danger">{error}</span> : null}
        </p>
        <p className="text-sm text-ink-muted">Can&apos;t find it? Check your spam folder, or make sure the address above is right.</p>
      </div>
    </section>
  );
}
