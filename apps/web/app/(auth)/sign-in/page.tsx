import type { Metadata } from "next";
import { getAuthProviders } from "@/lib/auth-providers";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

type Props = { searchParams: Promise<{ error?: string }> };

export default async function SignInPage({ searchParams }: Props) {
  const [{ google }, { error }] = await Promise.all([getAuthProviders(), searchParams]);
  return <SignInForm isGoogleEnabled={google} hasOAuthError={Boolean(error)} />;
}
