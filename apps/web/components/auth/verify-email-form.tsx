"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "../../hooks/auth/useAuth";
import { AuthSubmit } from "./auth-fields";

const linkClassName =
  "font-semibold text-primary no-underline transition-colors hover:text-ink-accent";

export function VerifyEmailForm({ token }: { token: string | null }) {
  const [complete, setComplete] = useState(false);
  const { verifyEmail, isVerifyingEmail, verifyEmailError } = useAuth();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    try {
      await verifyEmail({ token });
      setComplete(true);
    } catch {
      return;
    }
  }

  if (!token) {
    return (
      <div className="flex flex-col gap-4 py-8">
        <h1 className="m-0 text-3xl font-bold tracking-tight text-stone-900">
          Invalid verification link
        </h1>
        <p role="alert" className="m-0 text-sm leading-relaxed text-stone-600">
          This verification link is missing its token.
        </p>
        <Link href="/login" className={linkClassName}>
          Return to login
        </Link>
      </div>
    );
  }

  if (complete) {
    return (
      <div className="flex flex-col gap-4 py-8">
        <h1 className="m-0 text-3xl font-bold tracking-tight text-stone-900">
          Email verified
        </h1>
        <p className="m-0 text-sm leading-relaxed text-stone-600">
          Your account is ready. You can now log in.
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
          Verify your email
        </h1>
        <p className="m-0 text-sm leading-relaxed text-stone-600">
          Confirm this email address to activate your Veritas account.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {verifyEmailError && (
          <p role="alert" className="mb-4 text-xs font-medium text-rose-700">
            {verifyEmailError.message}
          </p>
        )}
        <AuthSubmit pending={isVerifyingEmail} pendingLabel="Verifying…">
          Verify email
        </AuthSubmit>
      </form>
    </div>
  );
}
