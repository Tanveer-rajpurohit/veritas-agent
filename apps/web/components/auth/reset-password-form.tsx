"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "../../hooks/auth/useAuth";
import { validateNewPassword } from "../../lib/validation/auth";
import type { AuthFieldErrors } from "../../types/auth/types";
import { AuthPasswordField, AuthSubmit } from "./auth-fields";

const linkClassName =
  "font-semibold text-primary no-underline transition-colors hover:text-ink-accent";

export function ResetPasswordForm({ token }: { token: string | null }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [complete, setComplete] = useState(false);
  const { resetPassword, isResettingPassword, resetPasswordError } = useAuth();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const errors: AuthFieldErrors = {};
    const passwordError = validateNewPassword(password);
    if (passwordError) errors.password = passwordError;
    if (confirmPassword !== password) {
      errors.confirmPassword = "Passwords do not match";
    }
    setFieldErrors(errors);
    if (!token || Object.keys(errors).length > 0) return;

    try {
      await resetPassword({ token, new_password: password });
      setComplete(true);
    } catch {
      return;
    }
  }

  if (!token) {
    return (
      <div className="flex flex-col gap-4 py-8">
        <h1 className="m-0 text-3xl font-bold tracking-tight text-stone-900">
          Invalid reset link
        </h1>
        <p role="alert" className="m-0 text-sm leading-relaxed text-stone-600">
          This password reset link is missing its token. Request a new link.
        </p>
        <Link href="/forgot-password" className={linkClassName}>
          Request another reset link
        </Link>
      </div>
    );
  }

  if (complete) {
    return (
      <div className="flex flex-col gap-4 py-8">
        <h1 className="m-0 text-3xl font-bold tracking-tight text-stone-900">
          Password updated
        </h1>
        <p className="m-0 text-sm leading-relaxed text-stone-600">
          Your sessions were signed out. Log in with your new password.
        </p>
        <Link href="/login" className={linkClassName}>
          Continue to login
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 py-8">
      <div className="flex flex-col gap-2.5">
        <h1 className="m-0 text-3xl font-bold tracking-tight text-stone-900">
          Choose a new password
        </h1>
        <p className="m-0 text-sm leading-relaxed text-stone-600">
          Use at least 12 characters.
        </p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <AuthPasswordField
          label="New password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password}
          required
        />
        <AuthPasswordField
          label="Confirm new password"
          name="confirmPassword"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          error={fieldErrors.confirmPassword}
          required
        />

        {resetPasswordError && (
          <p role="alert" className="m-0 text-xs font-medium text-rose-700">
            {resetPasswordError.message}
          </p>
        )}

        <AuthSubmit pending={isResettingPassword} pendingLabel="Updating password…">
          Update password
        </AuthSubmit>
      </form>
    </div>
  );
}
