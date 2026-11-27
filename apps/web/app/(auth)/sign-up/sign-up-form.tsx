"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button, TextField } from "@veritas/ui";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage, retryAfterCapture } from "@/lib/auth-errors";
import { CheckInbox } from "../check-inbox";

const MIN_PASSWORD = 10;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = Partial<Record<"name" | "email" | "password", string>>;

function validate(name: string, email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!name.trim()) errors.name = "Enter your name.";
  if (!EMAIL_PATTERN.test(email.trim())) errors.email = "Enter a valid email address, like name@company.com.";
  if (password.length < MIN_PASSWORD) errors.password = `Use at least ${MIN_PASSWORD} characters.`;
  return errors;
}

export function SignUpForm() {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "");
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    const errors = validate(name, email, password);
    setFieldErrors(errors);
    setFormError("");
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    const retry = retryAfterCapture();
    const { error } = await authClient.signUp.email(
      { name: name.trim(), email, password, callbackURL: "/onboarding" },
      retry.fetchOptions,
    );
    setIsSubmitting(false);

    // An existing address gets the same "check your inbox" screen, so the
    // form never reveals who already has an account.
    if (error && error.code !== "USER_ALREADY_EXISTS" && error.code !== "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
      setFormError(authErrorMessage(error, retry.seconds()));
      return;
    }
    setSentTo(email);
  };

  if (sentTo) return <CheckInbox email={sentTo} />;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-base text-ink-muted">Start with an empty workspace. You can bring in files whenever you&apos;re ready.</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <TextField label="Full name" name="name" autoComplete="name" error={fieldErrors.name} />
        <TextField label="Work email" name="email" type="email" autoComplete="email" inputMode="email" error={fieldErrors.email} />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          hint={`At least ${MIN_PASSWORD} characters.`}
          error={fieldErrors.password}
        />
        {formError ? (
          <p role="alert" className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
            {formError}
          </p>
        ) : null}
        <Button type="submit" size="lg" isLoading={isSubmitting} loadingLabel="Creating your account…">
          Create account
        </Button>
      </form>

      <p className="text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-ink underline underline-offset-4 hover:text-accent-text">
          Sign in
        </Link>
      </p>
    </div>
  );
}
