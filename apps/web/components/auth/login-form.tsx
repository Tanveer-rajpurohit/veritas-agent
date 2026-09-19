"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../../hooks/auth/useAuth";
import { safeInternalPath, validateLoginForm } from "../../lib/validation/auth";
import type { AuthFieldErrors } from "../../types/auth/types";
import { AuthField, AuthPasswordField, AuthSubmit } from "./auth-fields";

const linkClassName =
  "font-semibold text-[#487aa8] no-underline transition-colors hover:text-[#3d6991]";
const smallLinkClassName = `${linkClassName} text-xs font-medium`;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeInternalPath(searchParams.get("redirect"));
  const { login, isLoggingIn, loginError } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const failures = validateLoginForm({ email, password });
    setFieldErrors(failures);
    if (Object.keys(failures).length > 0) {
      return;
    }
    try {
      await login({ email: email.trim(), password });
      router.replace(redirectTo === "/" ? "/workspace" : redirectTo);
    } catch {
      return;
    }
  }

  return (
    <div className="flex flex-col gap-5 py-6">
      <div className="flex flex-col gap-2 pb-1">
        <h1 className="m-0 font-sans font-bold text-3xl sm:text-4xl tracking-tight text-stone-900">
          Log in to Veritas
        </h1>
        <p className="m-0 text-sm leading-relaxed text-stone-600 font-sans">
          Your court matters, client files, and verified draft notes are ready.
        </p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
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

        <AuthPasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password}
          action={
            <Link href="/forgot-password" className={smallLinkClassName}>
              Forgot password?
            </Link>
          }
          required
        />

        {loginError && (
          <p role="alert" className="m-0 text-xs font-medium text-rose-700">
            {loginError.message}
          </p>
        )}

        <AuthSubmit pending={isLoggingIn} pendingLabel="Signing in…">
          Log in
        </AuthSubmit>

        <div className="text-xs text-stone-500 pt-1 text-center">
          <p className="m-0">
            New to Veritas?{" "}
            <Link href="/register" className={linkClassName}>
              Create your account
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
