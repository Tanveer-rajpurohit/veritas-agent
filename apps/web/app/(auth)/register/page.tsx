import type { Metadata } from "next";
import { AuthShell } from "../../../components/auth/auth-shell";
import { RegisterForm } from "../../../components/auth/register-form";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create your Veritas chamber to start drafting with evidence beside you.",
  alternates: { canonical: "/register" },
};

export default function RegisterPage() {
  return (
    <AuthShell>
      <RegisterForm />
    </AuthShell>
  );
}
