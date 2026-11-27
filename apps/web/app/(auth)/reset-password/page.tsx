import type { Metadata } from "next";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Choose a new password",
  // The token is in the URL; never send it to another site as a referrer.
  referrer: "no-referrer",
};

type Props = { searchParams: Promise<{ token?: string; error?: string }> };

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token, error } = await searchParams;
  return <ResetPasswordForm token={!error && token ? token : null} />;
}
