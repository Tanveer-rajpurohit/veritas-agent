"use client";

import Link from "next/link";
import { useState } from "react";
import { useForgotPassword } from "../../hooks/auth/useAuth";
import { validatePasswordResetForm } from "../../lib/validation/auth";
import type { AuthFieldErrors } from "../../types/auth/types";
import { AuthField, AuthSubmit } from "./auth-fields";

const linkClassName = "font-semibold text-primary no-underline transition-colors hover:text-ink-accent";

export function ForgotPasswordForm() {
  const forgotPasswordMutation = useForgotPassword();
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [shake, setShake] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const failures = validatePasswordResetForm({ email });
    setFieldErrors(failures);
    if (Object.keys(failures).length > 0) {
      setShake(true);
      return;
    }
    try {
      await forgotPasswordMutation.mutateAsync({ email: email.trim() });
      setSentTo(email.trim());
    } catch {
      return;
    }
  }

  if (sentTo) {
    return (
      <div className="auth-fade-up flex flex-col gap-[1.375rem] py-8">
        <div className="flex flex-col gap-2.5 pb-3">
          <h1 className="m-0 text-[clamp(2rem,3vw,2.5rem)] leading-[1.08] font-semibold tracking-[-0.032em] text-pretty text-foreground">
            Check your inbox
          </h1>
          <p className="m-0 text-[0.9375rem] leading-[1.55] text-pretty text-ink-muted">
            If {sentTo} matches an account, the reset link is on its way.
          </p>
        </div>
        <div className="text-sm text-ink-muted">
          <p className="m-0">
            Remembered your password?{" "}
            <Link href="/login" className={linkClassName}>
              Back to log in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`auth-fade-up flex flex-col gap-[1.375rem] py-8 ${shake ? "auth-shake" : ""}`} onAnimationEnd={() => setShake(false)}>
      <div className="flex flex-col gap-2.5 pb-3">
        <h1 className="m-0 text-[clamp(2rem,3vw,2.5rem)] leading-[1.08] font-semibold tracking-[-0.032em] text-pretty text-foreground">
          Reset password
        </h1>
        <p className="m-0 text-[0.9375rem] leading-[1.55] text-pretty text-ink-muted">
          Enter the email you signed up with and we will send a reset link there.
        </p>
      </div>

      <form className="flex flex-col gap-[1.125rem]" onSubmit={handleSubmit} noValidate>
        <AuthField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="name@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors.email}
          required
        />

        {forgotPasswordMutation.error && (
          <p
            role="alert"
            aria-live="polite"
            className="m-0 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium leading-5 text-rose-700"
          >
            {forgotPasswordMutation.error.message}
          </p>
        )}

        <AuthSubmit
          pending={forgotPasswordMutation.isPending}
          pendingLabel="Sending link…"
        >
          Send reset link
        </AuthSubmit>

        <div className="text-sm text-ink-muted">
          <p className="m-0">
            Remembered your password?{" "}
            <Link href="/login" className={linkClassName}>
              Back to log in
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
