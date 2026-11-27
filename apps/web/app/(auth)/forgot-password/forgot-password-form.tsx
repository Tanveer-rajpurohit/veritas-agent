"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button, TextField } from "@veritas/ui";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordForm() {
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    setFormError("");
    if (!EMAIL_PATTERN.test(email)) {
      setError("Enter a valid email address, like name@company.com.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    const { error: err } = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
    setIsSubmitting(false);
    if (err) {
      setFormError(authErrorMessage(err));
      return;
    }
    setSentTo(email);
  };

  if (sentTo) {
    // Same screen whether or not the address has an account.
    return (
      <section aria-labelledby="reset-sent-title" className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 id="reset-sent-title" className="text-3xl font-semibold tracking-tight">
            Check your inbox
          </h1>
          <p className="text-base text-ink-muted">
            If <span className="font-medium text-ink">{sentTo}</span> has a Veritas account, we sent it a link to choose a
            new password. The link works for 1 hour.
          </p>
        </div>
        <Link
          href="/sign-in"
          className="text-sm font-medium text-ink underline underline-offset-4 hover:text-accent-text"
        >
          Back to sign in
        </Link>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Reset your password</h1>
        <p className="text-base text-ink-muted">Enter the email you sign in with and we&apos;ll send you a reset link.</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <TextField label="Email" name="email" type="email" autoComplete="email" inputMode="email" error={error} autoFocus />
        {formError ? (
          <p role="alert" className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
            {formError}
          </p>
        ) : null}
        <Button type="submit" size="lg" isLoading={isSubmitting} loadingLabel="Sending link…">
          Send reset link
        </Button>
      </form>

      <p className="text-sm text-ink-muted">
        Remembered it?{" "}
        <Link href="/sign-in" className="font-medium text-ink underline underline-offset-4 hover:text-accent-text">
          Sign in
        </Link>
      </p>
    </div>
  );
}
