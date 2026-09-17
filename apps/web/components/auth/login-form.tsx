"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { safeInternalPath, validateLoginForm } from "../../lib/validation/auth";
import type { AuthFieldErrors } from "../../types/auth/types";
import { AuthCheckbox, AuthField, AuthPasswordField, AuthSubmit } from "./auth-fields";

const linkClassName = "font-semibold text-[#487aa8] no-underline transition-colors hover:text-[#3d6991]";
const smallLinkClassName = `${linkClassName} text-xs font-medium`;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeInternalPath(searchParams.get("redirect"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const failures = validateLoginForm({ email, password, rememberMe });
    setFieldErrors(failures);
    if (Object.keys(failures).length > 0) {
      return;
    }
    setPending(true);
    window.setTimeout(() => router.push(redirectTo), 450);
  }

  return (
    <div className="flex flex-col gap-5 py-6">
      <div className="flex flex-col gap-2 pb-2">
        <h1 className="m-0 font-display text-3xl sm:text-4xl font-normal tracking-tight text-stone-900">
          Log in to Chamber
        </h1>
        <p className="m-0 text-sm leading-relaxed text-stone-600">
          Your court matters, client files, and verified draft notes are ready.
        </p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <AuthField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="advocate@chamber.in"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors.email}
          required
        />

        <AuthPasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          placeholder="••••••••••"
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

        <AuthCheckbox checked={rememberMe} onChange={setRememberMe}>
          Keep me signed in on this device
        </AuthCheckbox>

        <AuthSubmit pending={pending} pendingLabel="Signing in…">
          Log in
        </AuthSubmit>

        <div className="text-xs text-stone-500 pt-1 text-center">
          <p className="m-0">
            New to Veritas?{" "}
            <Link href="/register" className={linkClassName}>
              Create your chamber workspace
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
