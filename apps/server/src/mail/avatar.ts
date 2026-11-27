import type { Kv } from "../connectors/store";
import { rasterImageType } from "./remote-image";

const FAVICON_ENDPOINT = "https://www.google.com/s2/favicons";
const FAVICON_SIZE = 64;
const FAVICON_TIMEOUT_MS = 5_000;
const FAVICON_MAX_BYTES = 256 * 1024;
const HIT_TTL_SECONDS = 7 * 24 * 3600;
const MISS_TTL_SECONDS = 24 * 3600;
const MISS = "miss";
/** Google answers from www.google.com or redirects to a gstatic.com host. */
const GOOGLE_HOSTS = /(^|\.)(google\.com|gstatic\.com)$/;

export type Avatar = { contentType: string; body: Buffer };

type FaviconResult = { kind: "hit"; avatar: Avatar } | { kind: "miss" } | { kind: "error" };

/**
 * Google serves its placeholder globe with a 404 status when it knows no icon
 * for a domain, so any non-200 is a miss. Network errors and 5xx are not
 * cached: an outage shouldn't hide every logo for a day.
 */
async function fetchFavicon(fetchImpl: typeof fetch, domain: string): Promise<FaviconResult> {
  const url = `${FAVICON_ENDPOINT}?${new URLSearchParams({ domain, sz: String(FAVICON_SIZE) })}`;
  let res: Response;
  try {
    res = await fetchImpl(url, { signal: AbortSignal.timeout(FAVICON_TIMEOUT_MS), redirect: "follow" });
  } catch {
    return { kind: "error" };
  }
  if (res.status >= 500) return { kind: "error" };
  if (res.url && !GOOGLE_HOSTS.test(new URL(res.url).hostname)) return { kind: "error" };
  const contentType = rasterImageType(res.headers.get("content-type") ?? undefined);
  if (res.status !== 200 || !contentType) return { kind: "miss" };
  let body: Buffer;
  try {
    body = Buffer.from(await res.arrayBuffer());
  } catch {
    return { kind: "error" };
  }
  if (body.length === 0 || body.length > FAVICON_MAX_BYTES) return { kind: "miss" };
  return { kind: "hit", avatar: { contentType, body } };
}

/** A cached hit or miss, or null when the entry is unreadable and should be refetched. */
function decodeCached(raw: string): { avatar: Avatar | null } | null {
  if (raw === MISS) return { avatar: null };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || !("t" in parsed) || !("b" in parsed)) return null;
  const { t, b } = parsed;
  const contentType = typeof t === "string" ? rasterImageType(t) : null;
  if (!contentType || typeof b !== "string") return null;
  return { avatar: { contentType, body: Buffer.from(b, "base64") } };
}

/** A sender logo for a validated registrable domain, cached in Redis; null when there is none. */
export async function loadAvatar(deps: { kv: Kv; fetch: typeof fetch }, domain: string): Promise<Avatar | null> {
  const key = `mail:avatar:${domain}`;
  const cached = await deps.kv.get(key);
  const decoded = cached === null ? null : decodeCached(cached);
  if (decoded) return decoded.avatar;

  const result = await fetchFavicon(deps.fetch, domain);
  if (result.kind === "hit") {
    const { contentType, body } = result.avatar;
    await deps.kv.set(key, JSON.stringify({ t: contentType, b: body.toString("base64") }), HIT_TTL_SECONDS);
    return result.avatar;
  }
  if (result.kind === "miss") await deps.kv.set(key, MISS, MISS_TTL_SECONDS);
  return null;
}
