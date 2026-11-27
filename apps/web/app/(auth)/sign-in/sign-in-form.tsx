"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, TextField } from "@veritas/ui";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage, retryAfterCapture } from "@/lib/auth-errors";
import { CheckInbox } from "../check-inbox";
import { GoogleButton, OrDivider } from "../google-button";

type FieldErrors = Partial<Record<"email" | "password", string>>;

type Props = { isGoogleEnabled: boolean; hasOAuthError: boolean };

export function SignInForm({ isGoogleEnabled, hasOAuthError }: Props) {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    const errors: FieldErrors = {};
    if (!email) errors.email = "Enter your email address.";
    if (!password) errors.password = "Enter your password.";
    setFieldErrors(errors);
    setFormError("");
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    const retry = retryAfterCapture();
    const { error } = await authClient.signIn.email({ email, password }, retry.fetchOptions);
    setIsSubmitting(false);

    if (error?.code === "EMAIL_NOT_VERIFIED") {
      setUnverifiedEmail(email);
      return;
    }
    if (error) {
      setFormError(authErrorMessage(error, retry.seconds()));
      return;
    }
    router.replace("/");
  };

  if (unverifiedEmail) {
    return (
      <CheckInbox
        email={unverifiedEmail}
        title="Verify your email"
        intro="Confirm your email before signing in. We sent a confirmation link to"
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-base text-ink-muted">Sign in to pick up where you left off.</p>
      </div>

      {hasOAuthError ? (
        <p role="alert" className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
          Google sign-in didn&apos;t finish. Try again, or sign in with your email.
        </p>
      ) : null}

      {isGoogleEnabled ? (
        <>
          <GoogleButton />
          <OrDivider />
        </>
      ) : null}

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <TextField label="Email" name="email" type="email" autoComplete="email" inputMode="email" error={fieldErrors.email} />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          error={fieldErrors.password}
          labelAside={
            <Link href="/forgot-password" className="text-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline">
              Forgot password?
            </Link>
          }
        />
        {formError ? (
          <p role="alert" className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
            {formError}
          </p>
        ) : null}
        <Button type="submit" size="lg" isLoading={isSubmitting} loadingLabel="Signing in…">
          Sign in
        </Button>
      </form>

      <p className="text-sm text-ink-muted">
        New to Veritas?{" "}
        <Link href="/sign-up" className="font-medium text-ink underline underline-offset-4 hover:text-accent-text">
          Create an account
        </Link>
      </p>
    </div>
  );
}
