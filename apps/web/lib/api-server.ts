import "server-only";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { z } from "zod";

const API_ORIGIN = process.env.API_ORIGIN ?? "http://127.0.0.1:4000";

export class ApiRequestError extends Error {
  constructor(readonly status: number) {
    super(`API request failed with ${status}`);
  }
}

/** GET from the API as the signed-in user, validating the response shape. */
export async function apiGet<T extends z.ZodType>(path: string, schema: T): Promise<z.infer<T>> {
  const res = await fetch(`${API_ORIGIN}${path}`, {
    headers: { cookie: (await cookies()).toString() },
    cache: "no-store",
  });
  // An expired or revoked session sends people to sign in, not to an error page.
  if (res.status === 401) redirect("/sign-in");
  if (res.status === 404) notFound();
  if (!res.ok) throw new ApiRequestError(res.status);
  return schema.parse(await res.json());
}
