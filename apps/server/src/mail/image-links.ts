import { createHmac, hkdfSync, timingSafeEqual } from "node:crypto";
import { MAIL_CONTENT_ID_MAX } from "@veritas/shared";

const HOUR_MS = 3_600_000;
/** Longer URLs are almost always tracking links; they are dropped instead of signed. */
export const MAX_PROXIED_URL_LENGTH = 2048;

/** A key used only for image links, so a leak of one can't forge vault or session material. */
export function deriveImageLinkKey(secret: string): Buffer {
  return Buffer.from(hkdfSync("sha256", Buffer.from(secret, "utf8"), Buffer.alloc(0), "veritas/mail-image-links", 32));
}

type Claims = { u: string; w: string; e: number };

const mac = (key: Buffer, payload: string) => createHmac("sha256", key).update(payload).digest();

export function signImageToken(key: Buffer, claims: Claims): string {
  const payload = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  return `${payload}.${mac(key, payload).toString("base64url")}`;
}

/** The URL a token was issued for, or null when it is forged, for another workspace, or expired. */
export function verifyImageToken(key: Buffer, token: string, expect: { workspaceId: string; now: number }): URL | null {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;
  const given = Buffer.from(signature, "base64url");
  const wanted = mac(key, payload);
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return null;

  let claims: unknown;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof claims !== "object" || claims === null) return null;
  const { u, w, e } = claims as Partial<Record<keyof Claims, unknown>>;
  if (typeof u !== "string" || typeof w !== "string" || typeof e !== "number") return null;
  if (w !== expect.workspaceId || e <= expect.now) return null;
  return URL.canParse(u) ? new URL(u) : null;
}

/** Rewrites image sources in mail HTML to same-origin server routes. Null means the image can't be shown. */
export type ImageLinks = {
  proxy(src: string): string | null;
  inline(messageId: string, contentId: string): string | null;
};

export function createImageLinks(key: Buffer, workspaceId: string, now: number): ImageLinks {
  // Expiry is rounded up to the next hour boundary plus one, so links stay identical
  // (and browser-cacheable) within an hour and live between one and two hours.
  const expiresAt = (Math.floor(now / HOUR_MS) + 2) * HOUR_MS;
  const base = `/api/v1/workspaces/${workspaceId}/mail`;
  return {
    proxy(src) {
      if (src.length > MAX_PROXIED_URL_LENGTH || !URL.canParse(src)) return null;
      const url = new URL(src);
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
      return `${base}/image?u=${signImageToken(key, { u: url.href, w: workspaceId, e: expiresAt })}`;
    },
    inline(messageId, contentId) {
      const segment = encodeURIComponent(contentId);
      if (segment.length > MAIL_CONTENT_ID_MAX) return null;
      return `${base}/messages/${encodeURIComponent(messageId)}/inline/${segment}`;
    },
  };
}
