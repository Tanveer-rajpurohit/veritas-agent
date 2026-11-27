import type { Metadata } from "next";
import { getAuthProviders } from "@/lib/auth-providers";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignUpPage() {
  const { google } = await getAuthProviders();
  return <SignUpForm isGoogleEnabled={google} />;
}
