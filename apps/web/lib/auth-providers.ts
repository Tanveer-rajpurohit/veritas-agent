import "server-only";
import { authProviders, type AuthProviders } from "@veritas/shared";

const API_ORIGIN = process.env.API_ORIGIN ?? "http://127.0.0.1:4000";

/** Sign-in pages still render (email only) if the API can't say which providers exist. */
export async function getAuthProviders(): Promise<AuthProviders> {
  try {
    const res = await fetch(`${API_ORIGIN}/api/v1/auth/providers`, { cache: "no-store" });
    if (!res.ok) return { google: false };
    return authProviders.parse(await res.json());
  } catch {
    return { google: false };
  }
}
