import { describe, expect, it } from "vitest";
import { createImageLinks, deriveImageLinkKey, MAX_PROXIED_URL_LENGTH, signImageToken, verifyImageToken } from "./image-links";

const KEY = deriveImageLinkKey("a-connector-kek-that-is-at-least-32-chars");
const WS = "0198f3a0-0000-7000-8000-000000000001";
const OTHER_WS = "0198f3a0-0000-7000-8000-000000000002";
const NOW = Date.UTC(2026, 10, 27, 10, 15);
const HOUR = 3_600_000;

const tokenOf = (link: string) => new URL(link, "http://web.test").searchParams.get("u")!;

describe("image tokens", () => {
  it("round-trips the URL for the same workspace before expiry", () => {
    const token = signImageToken(KEY, { u: "https://cdn.example/a.png?x=1", w: WS, e: NOW + 1000 });
    expect(verifyImageToken(KEY, token, { workspaceId: WS, now: NOW })?.href).toBe("https://cdn.example/a.png?x=1");
  });

  it("rejects expired tokens and tokens for another workspace", () => {
    const token = signImageToken(KEY, { u: "https://cdn.example/a.png", w: WS, e: NOW });
    expect(verifyImageToken(KEY, token, { workspaceId: WS, now: NOW })).toBeNull();
    const fresh = signImageToken(KEY, { u: "https://cdn.example/a.png", w: WS, e: NOW + HOUR });
    expect(verifyImageToken(KEY, fresh, { workspaceId: OTHER_WS, now: NOW })).toBeNull();
  });

  it("rejects tampered payloads, signatures, other keys and junk", () => {
    const token = signImageToken(KEY, { u: "https://cdn.example/a.png", w: WS, e: NOW + HOUR });
    const [payload, signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ u: "http://169.254.169.254/", w: WS, e: NOW + HOUR })).toString("base64url");
    expect(verifyImageToken(KEY, `${forged}.${signature}`, { workspaceId: WS, now: NOW })).toBeNull();
    expect(verifyImageToken(KEY, `${payload}.${Buffer.alloc(32).toString("base64url")}`, { workspaceId: WS, now: NOW })).toBeNull();
    expect(verifyImageToken(deriveImageLinkKey("another-secret-that-is-at-least-32-chars"), token, { workspaceId: WS, now: NOW })).toBeNull();
    for (const junk of ["", "abc", "a.b.c", `${token}.x`]) expect(verifyImageToken(KEY, junk, { workspaceId: WS, now: NOW })).toBeNull();
  });
});

describe("createImageLinks", () => {
  it("proxies http(s) URLs through a signed same-origin link that expires in one to two hours", () => {
    const links = createImageLinks(KEY, WS, NOW);
    const link = links.proxy("https://cdn.example/a.png")!;
    expect(link).toMatch(new RegExp(`^/api/v1/workspaces/${WS}/mail/image\\?u=[\\w-]+\\.[\\w-]+$`));
    expect(verifyImageToken(KEY, tokenOf(link), { workspaceId: WS, now: NOW + HOUR - 1 })?.href).toBe("https://cdn.example/a.png");
    expect(verifyImageToken(KEY, tokenOf(link), { workspaceId: WS, now: NOW + 2 * HOUR })).toBeNull();
  });

  it("issues the same link throughout an hour so browsers can cache it", () => {
    const a = createImageLinks(KEY, WS, Date.UTC(2026, 10, 27, 10, 0)).proxy("https://cdn.example/a.png");
    const b = createImageLinks(KEY, WS, Date.UTC(2026, 10, 27, 10, 59)).proxy("https://cdn.example/a.png");
    expect(a).toBe(b);
  });

  it("refuses non-http schemes and overlong URLs", () => {
    const links = createImageLinks(KEY, WS, NOW);
    expect(links.proxy("javascript:alert(1)")).toBeNull();
    expect(links.proxy("file:///etc/passwd")).toBeNull();
    expect(links.proxy(`https://cdn.example/${"a".repeat(MAX_PROXIED_URL_LENGTH)}`)).toBeNull();
  });

  it("builds inline links with an encoded Content-ID and refuses ones too long for a path segment", () => {
    const links = createImageLinks(KEY, WS, NOW);
    expect(links.inline("msg1", "image001.png@01DA")).toBe(`/api/v1/workspaces/${WS}/mail/messages/msg1/inline/image001.png%4001DA`);
    expect(links.inline("msg1", "x".repeat(101))).toBeNull();
  });
});
