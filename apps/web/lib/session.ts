import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_ORIGIN = process.env.API_ORIGIN ?? "http://127.0.0.1:4000";

export type SessionUser = { id: string; name: string; email: string; emailVerified: boolean; image: string | null };

/** Reads the current session from the API using the browser's cookies. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieHeader = (await cookies()).toString();
  if (!cookieHeader) return null;
  const res = await fetch(`${API_ORIGIN}/api/auth/get-session`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const body: unknown = await res.json();
  if (!body || typeof body !== "object" || !("user" in body)) return null;
  return (body as { user: SessionUser }).user;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  return user;
}
