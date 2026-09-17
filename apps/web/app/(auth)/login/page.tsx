import type { Metadata } from "next";
import { AuthShell } from "../../../components/auth/auth-shell";
import { LoginForm } from "../../../components/auth/login-form";

export const metadata: Metadata = {
  title: "Log in",
  description: "Sign in to continue working on your matters in Veritas.",
  alternates: { canonical: "/login" },
};

export default function LoginPage() {
  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  );
}
