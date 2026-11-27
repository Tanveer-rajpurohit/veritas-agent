import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";

export const IMAGE_FETCH_TIMEOUT_MS = 5_000;
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const ALLOWED_PORTS = new Set([80, 443]);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const USER_AGENT = "Mozilla/5.0 (compatible; VeritasImageProxy/1.0)";

/** Raster formats only: SVG can carry script, so it is never served. */
const RASTER_IMAGE_TYPES = new Set([
  "image/avif",
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/vnd.microsoft.icon",
  "image/webp",
  "image/x-icon",
]);

/** The bare MIME type when it is an allowed raster image, else null. */
export function rasterImageType(contentType: string | undefined): string | null {
  const type = contentType?.split(";")[0]?.trim().toLowerCase();
  return type && RASTER_IMAGE_TYPES.has(type) ? type : null;
}

const blocked = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8], // "this network", including 0.0.0.0
  ["10.0.0.0", 8],
  ["100.64.0.0", 10], // CGNAT
  ["127.0.0.0", 8],
  ["169.254.0.0", 16], // link-local, cloud metadata
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved and broadcast
] as const) {
  blocked.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["::", 96], // unspecified, loopback and IPv4-compatible
  ["64:ff9b::", 96], // NAT64 can reach IPv4 private space
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 32], // Teredo
  ["2001:db8::", 32],
  ["2002::", 16], // 6to4 embeds an arbitrary IPv4 address
  ["fc00::", 7], // unique local
  ["fe80::", 10], // link-local
  ["fec0::", 10],
  ["ff00::", 8], // multicast
] as const) {
  blocked.addSubnet(network, prefix, "ipv6");
}

/**
 * Whether an address must never be fetched. BlockList also matches
 * IPv4-mapped IPv6 forms (::ffff:10.0.0.1, ::ffff:a00:1) against the IPv4 rules.
 */
export function isBlockedAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 0) return true;
  return blocked.check(address, family === 4 ? "ipv4" : "ipv6");
}

export type RemoteImageErrorKind = "blocked" | "failed";

/** "blocked": the URL or its address is not allowed. "failed": the upstream did not return a usable image. */
export class RemoteImageError extends Error {
  constructor(readonly kind: RemoteImageErrorKind, reason: string) {
    super(reason);
    this.name = "RemoteImageError";
  }
}

export type ResolvedAddress = { address: string; family: number };
export type Resolve = (hostname: string) => Promise<ResolvedAddress[]>;

/** One HTTP exchange against an already vetted address. */
export type Hop = {
  status: number;
  location?: string;
  contentType?: string;
  contentLength?: number;
  body: AsyncIterable<Buffer>;
  discard: () => void;
};
export type Transport = (url: URL, pinned: ResolvedAddress, signal: AbortSignal) => Promise<Hop>;

export type FetchedImage = { contentType: string; body: Buffer };

const systemResolve: Resolve = (hostname) => lookup(hostname, { all: true, verbatim: true });

function assertAllowedUrl(url: URL): void {
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new RemoteImageError("blocked", "scheme");
  if (url.username || url.password) throw new RemoteImageError("blocked", "credentials");
  const port = url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80;
  if (!ALLOWED_PORTS.has(port)) throw new RemoteImageError("blocked", "port");
}

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new RemoteImageError("failed", "timeout"));
    if (signal.aborted) return onAbort();
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

/** Resolves once and rejects when any answer is non-public, so a mixed DNS answer can't smuggle in a private address. */
async function resolvePublic(hostname: string, resolve: Resolve, signal: AbortSignal): Promise<ResolvedAddress> {
  const host = hostname.replace(/^\[(.*)\]$/, "$1");
  const literal = isIP(host);
  let addresses: ResolvedAddress[];
  if (literal) addresses = [{ address: host, family: literal }];
  else {
    try {
      addresses = await abortable(resolve(host), signal);
    } catch (err) {
      if (err instanceof RemoteImageError) throw err;
      throw new RemoteImageError("failed", "dns");
    }
  }
  const [first] = addresses;
  if (!first) throw new RemoteImageError("failed", "dns");
  if (addresses.some((a) => isBlockedAddress(a.address))) throw new RemoteImageError("blocked", "address");
  return first;
}

/**
 * node:http with `lookup` pinned to the vetted address: the socket connects
 * there even if DNS answers differently a moment later, while the Host header
 * and TLS SNI still carry the hostname from the URL. No cookies, no Referer.
 */
export const nodeTransport: Transport = (url, pinned, signal) =>
  new Promise<Hop>((resolve, reject) => {
    const pinnedLookup: LookupFunction = (_hostname, options, callback) => {
      if (options.all) callback(null, [{ address: pinned.address, family: pinned.family }]);
      else callback(null, pinned.address, pinned.family);
    };
    const request = (url.protocol === "https:" ? https : http).request(
      url,
      { method: "GET", agent: false, signal, lookup: pinnedLookup, headers: { "user-agent": USER_AGENT, accept: "image/*" } },
      (res) => {
        const length = Number(res.headers["content-length"]);
        resolve({
          status: res.statusCode ?? 0,
          location: res.headers.location,
          contentType: res.headers["content-type"],
          contentLength: Number.isFinite(length) ? length : undefined,
          body: res,
          discard: () => res.destroy(),
        });
      },
    );
    request.on("error", reject);
    request.end();
  });

async function readCapped(hop: Hop, maxBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of hop.body) {
    total += chunk.length;
    if (total > maxBytes) {
      hop.discard();
      throw new RemoteImageError("failed", "too_large");
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, total);
}

/**
 * Fetches a remote raster image for the mail image proxy. Every hop is
 * re-validated (scheme, port, resolved address) before connecting.
 */
export async function fetchRemoteImage(
  input: URL,
  opts: { resolve?: Resolve; transport?: Transport; timeoutMs?: number; maxBytes?: number } = {},
): Promise<FetchedImage> {
  const resolve = opts.resolve ?? systemResolve;
  const transport = opts.transport ?? nodeTransport;
  const maxBytes = opts.maxBytes ?? IMAGE_MAX_BYTES;
  const signal = AbortSignal.timeout(opts.timeoutMs ?? IMAGE_FETCH_TIMEOUT_MS);

  let url = input;
  for (let redirects = 0; ; redirects++) {
    assertAllowedUrl(url);
    const pinned = await resolvePublic(url.hostname, resolve, signal);
    let hop: Hop;
    try {
      hop = await abortable(transport(url, pinned, signal), signal);
    } catch (err) {
      if (err instanceof RemoteImageError) throw err;
      throw new RemoteImageError("failed", "unreachable");
    }

    if (REDIRECT_STATUSES.has(hop.status)) {
      hop.discard();
      if (redirects >= MAX_REDIRECTS || !hop.location) throw new RemoteImageError("failed", "redirects");
      try {
        url = new URL(hop.location, url);
      } catch {
        throw new RemoteImageError("failed", "redirect_location");
      }
      continue;
    }

    if (hop.status !== 200) {
      hop.discard();
      throw new RemoteImageError("failed", "status");
    }
    const contentType = rasterImageType(hop.contentType);
    if (!contentType) {
      hop.discard();
      throw new RemoteImageError("failed", "content_type");
    }
    if (hop.contentLength !== undefined && hop.contentLength > maxBytes) {
      hop.discard();
      throw new RemoteImageError("failed", "too_large");
    }
    try {
      return { contentType, body: await abortable(readCapped(hop, maxBytes), signal) };
    } catch (err) {
      if (err instanceof RemoteImageError) throw err;
      throw new RemoteImageError("failed", "body");
    }
  }
}
