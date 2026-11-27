"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button, TextField } from "@veritas/ui";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";

const MIN_PASSWORD = 10;

type FieldErrors = Partial<Record<"password" | "confirm", string>>;

const linkClass = "text-sm font-medium text-ink underline underline-offset-4 hover:text-accent-text";

export function ResetPasswordForm({ token }: { token: string | null }) {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  if (!token) {
    return (
      <section aria-labelledby="reset-invalid-title" className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 id="reset-invalid-title" className="text-3xl font-semibold tracking-tight">
            This link has expired
          </h1>
          <p className="text-base text-ink-muted">
            Reset links work once and for 1 hour. Request a new one and use the latest email.
          </p>
        </div>
        <Link href="/forgot-password" className={linkClass}>
          Request a new link
        </Link>
      </section>
    );
  }

  if (isDone) {
    return (
      <section aria-labelledby="reset-done-title" className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 id="reset-done-title" className="text-3xl font-semibold tracking-tight">
            Password updated
          </h1>
          <p className="text-base text-ink-muted">
            You&apos;ve been signed out on every device. Sign in with your new password.
          </p>
        </div>
        <Link
          href="/sign-in"
          className="inline-flex h-12 items-center justify-center rounded-lg bg-accent px-6 text-base font-semibold text-accent-ink transition-[background-color,transform] duration-150 ease-out-soft hover:bg-accent-hover active:scale-[0.98]"
        >
          Sign in
        </Link>
      </section>
    );
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirm") ?? "");

    const errors: FieldErrors = {};
    if (password.length < MIN_PASSWORD) errors.password = `Use at least ${MIN_PASSWORD} characters.`;
    else if (confirm !== password) errors.confirm = "The passwords don't match.";
    setFieldErrors(errors);
    setFormError("");
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    setIsSubmitting(false);
    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    setIsDone(true);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="text-base text-ink-muted">You&apos;ll use it the next time you sign in.</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <TextField
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          hint={`At least ${MIN_PASSWORD} characters.`}
          error={fieldErrors.password}
          autoFocus
        />
        <TextField
          label="Confirm new password"
          name="confirm"
          type="password"
          autoComplete="new-password"
          error={fieldErrors.confirm}
        />
        {formError ? (
          <p role="alert" className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
            {formError}{" "}
            {formError.includes("Request a new one") ? (
              <Link href="/forgot-password" className="font-medium underline underline-offset-4">
                Request a new link
              </Link>
            ) : null}
          </p>
        ) : null}
        <Button type="submit" size="lg" isLoading={isSubmitting} loadingLabel="Saving…">
          Save new password
        </Button>
      </form>
    </div>
  );
}
