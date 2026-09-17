import type { Metadata } from "next";
import { AuthShell } from "../../../components/auth/auth-shell";
import { LoginForm } from "../../../components/auth/login-form";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your Veritas workspace to draft and review with evidence beside you.",
  alternates: { canonical: "/login" },
};

export default function LoginPage() {
  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  );
}
