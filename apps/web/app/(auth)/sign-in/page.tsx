import type { Metadata } from "next";
import { getAuthProviders } from "@/lib/auth-providers";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

type Props = { searchParams: Promise<{ error?: string | string[] }> };

export default async function SignInPage({ searchParams }: Props) {
  const [{ google }, { error }] = await Promise.all([getAuthProviders(), searchParams]);
  // Better Auth appends its own code after ours: ?error=google&error=account_not_linked
  const codes = [error ?? []].flat();
  const oauthError = codes.includes("account_not_linked") ? "unconfirmed-account" : codes.length > 0 ? "failed" : null;
  return <SignInForm isGoogleEnabled={google} oauthError={oauthError} />;
}
