"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../../hooks/auth/useAuth";
import { validateRegisterForm } from "../../lib/validation/auth";
import type { AuthFieldErrors } from "../../types/auth/types";
import {
  AuthDivider,
  AuthField,
  AuthPasswordField,
  AuthSubmit,
  GoogleAuthButton,
} from "./auth-fields";

const linkClassName = "font-semibold text-[#487aa8] no-underline transition-colors hover:text-[#3d6991]";

export function RegisterForm() {
  const router = useRouter();
  const { register, isRegistering, registerError } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const failures = validateRegisterForm({ name, email, password });
    setFieldErrors(failures);
    if (Object.keys(failures).length > 0) {
      return;
    }
    try {
      await register({ name: name.trim(), email: email.trim(), password });
      router.replace("/workspace");
    } catch {
      return;
    }
  }

  return (
    <div className="flex flex-col gap-5 py-2">
      <div className="flex flex-col gap-2 pb-1">
        <h1 className="m-0 font-sans font-bold text-2xl sm:text-3xl tracking-tight text-stone-900">
          Create Account
        </h1>
        <p className="m-0 text-xs sm:text-sm leading-relaxed text-stone-600 font-sans">
          Set up your workspace and draft your first brief with evidence beside you.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <GoogleAuthButton label="Sign up with Google" />
        <AuthDivider text="or register with email" />
      </div>

      <form className="flex flex-col gap-3.5" onSubmit={handleSubmit} noValidate>
        <AuthField
          label="Full name"
          name="name"
          autoComplete="name"
          placeholder="Full name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={fieldErrors.name}
          required
        />

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
          name="new-password"
          autoComplete="new-password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password}
          hint="Use 8 or more characters with a number or symbol."
          required
        />

        {registerError && (
          <p role="alert" className="m-0 text-xs font-medium text-rose-700">
            {registerError.message}
          </p>
        )}

        <AuthSubmit pending={isRegistering} pendingLabel="Creating account…">
          Create account
        </AuthSubmit>

        <div className="text-xs text-stone-500 pt-1 text-center">
          <p className="m-0">
            Already have an account?{" "}
            <Link href="/login" className={linkClassName}>
              Log in here
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
