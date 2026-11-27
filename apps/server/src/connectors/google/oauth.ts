import { createHash, randomBytes } from "node:crypto";
import type { GoogleFeature } from "@veritas/shared";
import { z } from "zod";
import type { GoogleCredentials } from "../context";
import type { Kv } from "../store";

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
export const GOOGLE_TIMEOUT_MS = 10_000;

const SCOPE_PREFIX = "https://www.googleapis.com/auth/";
export const GMAIL_READONLY = `${SCOPE_PREFIX}gmail.readonly`;
export const GMAIL_SEND = `${SCOPE_PREFIX}gmail.send`;
const IDENTITY_SCOPES = ["openid", "email"];
const FEATURE_SCOPES: Record<GoogleFeature, string> = { gmail: GMAIL_READONLY, gmail_send: GMAIL_SEND };

export const STATE_TTL_SECONDS = 600;
const STATE_PREFIX = "oauth:google:state:";

/** Narrowest scopes first: identity, then one Gmail scope per enabled feature. */
export function scopesFor(features: GoogleFeature[]): string[] {
  return [...IDENTITY_SCOPES, ...new Set(features.map((f) => FEATURE_SCOPES[f]))];
}

/** "https://www.googleapis.com/auth/gmail.send" → "gmail.send", for user-facing errors. */
export const shortScope = (scope: string) => (scope.startsWith(SCOPE_PREFIX) ? scope.slice(SCOPE_PREFIX.length) : scope);

export const callbackUrl = (webOrigin: string) => new URL("/api/v1/connectors/google/callback", webOrigin).toString();

const base64Url = (buf: Buffer) => buf.toString("base64url");

export function createPkce() {
  const verifier = base64Url(randomBytes(32));
  return { verifier, challenge: base64Url(createHash("sha256").update(verifier).digest()) };
}

export function buildAuthUrl(google: GoogleCredentials, opts: { redirectUri: string; state: string; challenge: string; scopes: string[] }) {
  const url = new URL(GOOGLE_AUTH_URL);
  url.search = new URLSearchParams({
    client_id: google.clientId,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: opts.scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: opts.state,
    code_challenge: opts.challenge,
    code_challenge_method: "S256",
  }).toString();
  return url.toString();
}

/* ---------------- State (single use, bound to user + workspace) ---------------- */

const pendingState = z.object({
  userId: z.string(),
  workspaceId: z.string(),
  verifier: z.string(),
  scopes: z.array(z.string()),
});
export type PendingState = z.infer<typeof pendingState>;

export async function saveState(kv: Kv, data: PendingState): Promise<string> {
  const state = base64Url(randomBytes(32));
  await kv.set(STATE_PREFIX + state, JSON.stringify(data), STATE_TTL_SECONDS);
  return state;
}

/** Returns the pending flow once; a replayed or expired state gives null. */
export async function consumeState(kv: Kv, state: string): Promise<PendingState | null> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(state)) return null;
  const raw = await kv.take(STATE_PREFIX + state);
  if (!raw) return null;
  try {
    const parsed = pendingState.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/* ---------------- Token endpoint ---------------- */

const tokenResponse = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().positive(),
  refresh_token: z.string().min(1).optional(),
  scope: z.string().default(""),
  id_token: z.string().optional(),
});

export type TokenSet = { accessToken: string; refreshToken?: string; expiresAt: Date; scopes: string[]; idToken?: string };

export type GoogleOAuthErrorKind = "invalid_grant" | "rejected" | "unavailable";

export class GoogleOAuthError extends Error {
  constructor(readonly kind: GoogleOAuthErrorKind) {
    super(`Google OAuth ${kind}`);
    this.name = "GoogleOAuthError";
  }
}

async function postForm(fetchImpl: typeof fetch, url: string, form: Record<string, string>): Promise<Response> {
  try {
    return await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(form).toString(),
      signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS),
    });
  } catch {
    throw new GoogleOAuthError("unavailable");
  }
}

async function readTokens(res: Response, now: number): Promise<TokenSet> {
  if (!res.ok) {
    if (res.status === 429 || res.status >= 500) throw new GoogleOAuthError("unavailable");
    const body: unknown = await res.json().catch(() => null);
    const code = typeof body === "object" && body !== null && "error" in body ? body.error : null;
    throw new GoogleOAuthError(code === "invalid_grant" ? "invalid_grant" : "rejected");
  }
  const parsed = tokenResponse.safeParse(await res.json().catch(() => null));
  if (!parsed.success) throw new GoogleOAuthError("rejected");
  const t = parsed.data;
  return {
    accessToken: t.access_token,
    refreshToken: t.refresh_token,
    expiresAt: new Date(now + t.expires_in * 1000),
    scopes: t.scope.split(" ").filter(Boolean),
    idToken: t.id_token,
  };
}

export async function exchangeCode(
  fetchImpl: typeof fetch,
  google: GoogleCredentials,
  opts: { code: string; verifier: string; redirectUri: string; now: number },
): Promise<TokenSet> {
  const res = await postForm(fetchImpl, GOOGLE_TOKEN_URL, {
    grant_type: "authorization_code",
    code: opts.code,
    code_verifier: opts.verifier,
    redirect_uri: opts.redirectUri,
    client_id: google.clientId,
    client_secret: google.clientSecret,
  });
  return readTokens(res, opts.now);
}

export async function refreshAccessToken(
  fetchImpl: typeof fetch,
  google: GoogleCredentials,
  refreshToken: string,
  now: number,
): Promise<TokenSet> {
  const res = await postForm(fetchImpl, GOOGLE_TOKEN_URL, {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: google.clientId,
    client_secret: google.clientSecret,
  });
  return readTokens(res, now);
}

/** Best effort: a failed revoke must not block disconnecting locally. */
export async function revokeToken(fetchImpl: typeof fetch, token: string): Promise<boolean> {
  try {
    const res = await postForm(fetchImpl, GOOGLE_REVOKE_URL, { token });
    return res.ok;
  } catch {
    return false;
  }
}

const idTokenClaims = z.object({
  iss: z.enum(["https://accounts.google.com", "accounts.google.com"]),
  aud: z.string(),
  email: z.email(),
  email_verified: z.boolean().optional(),
});

/**
 * Reads the account email from the ID token. The token came straight from
 * Google's token endpoint over TLS, which OIDC Core 3.1.3.7 accepts in place
 * of a signature check; issuer and audience are still verified.
 */
export function emailFromIdToken(idToken: string | undefined, clientId: string): string | null {
  const payload = idToken?.split(".")[1];
  if (!payload) return null;
  try {
    const claims = idTokenClaims.safeParse(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
    if (!claims.success || claims.data.aud !== clientId || claims.data.email_verified === false) return null;
    return claims.data.email;
  } catch {
    return null;
  }
}
