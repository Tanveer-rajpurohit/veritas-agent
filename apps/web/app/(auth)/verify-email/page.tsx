import type { Metadata } from "next";
import { AuthShell } from "../../../components/auth/auth-shell";
import { VerifyEmailForm } from "../../../components/auth/verify-email-form";

export const metadata: Metadata = {
  title: "Verify email",
  description: "Verify your Veritas account email address.",
  alternates: { canonical: "/verify-email" },
};

interface VerifyEmailPageProps {
  searchParams: Promise<{ token?: string | string[] }>;
}

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const tokenValue = (await searchParams).token;
  const token = typeof tokenValue === "string" ? tokenValue : null;

  return (
    <AuthShell>
      <VerifyEmailForm token={token} />
    </AuthShell>
  );
}
