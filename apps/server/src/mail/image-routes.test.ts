import { describe, expect, it } from "vitest";
import { GMAIL_READONLY } from "../connectors/google/oauth";
import { fakeFetch, json, setup, type FakeCall, type FakeHandler } from "../connectors/test-harness";
import { createImageLinks } from "./image-links";
import { RemoteImageError } from "./remote-image";

const WS = "0198f3a0-0000-7000-8000-000000000001";
const OTHER_WS = "0198f3a0-0000-7000-8000-000000000002";
const members = { [WS]: { alice: "owner" as const }, [OTHER_WS]: { mallory: "owner" as const } };
const KEY = { workspaceId: WS, userId: "alice", provider: "google" as const };
const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";
const NOW = Date.UTC(2026, 10, 27, 10, 15);
const png = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
const b64 = (s: string | Buffer) => Buffer.from(s).toString("base64url");

const gmailRoute = (path: RegExp, respond: (call: FakeCall) => Response): FakeHandler => (call) =>
  call.url.href.startsWith(GMAIL) && path.test(call.url.pathname) ? respond(call) : undefined;

async function get(t: ReturnType<typeof setup>, url: string, user: string | null = "alice") {
  const app = await t.build();
  return app.inject({ method: "GET", url, headers: user ? { "x-test-user": user } : {} });
}

function expectImageHeaders(headers: Record<string, unknown>, contentType: string) {
  expect(headers["content-type"]).toBe(contentType);
  expect(headers["cache-control"]).toBe("private, max-age=86400");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["content-security-policy"]).toBe("default-src 'none'");
  expect(headers["set-cookie"]).toBeUndefined();
}

describe("GET /mail/image", () => {
  function withImage(fetchImage: (url: URL) => Promise<{ contentType: string; body: Buffer }>) {
    const t = setup({ members, fetchImage, now: () => NOW });
    t.addUser("alice");
    t.addUser("mallory");
    const link = (url: string, workspaceId = WS) => createImageLinks(t.deps.imageLinkKey, workspaceId, NOW).proxy(url)!;
    return { t, link };
  }

  it("serves the proxied bytes with locked-down headers", async () => {
    const fetched: string[] = [];
    const { t, link } = withImage(async (url) => {
      fetched.push(url.href);
      return { contentType: "image/png", body: png };
    });
    const res = await get(t, link("https://cdn.example/a.png"));
    expect(res.statusCode).toBe(200);
    expect(res.rawPayload).toEqual(png);
    expectImageHeaders(res.headers, "image/png");
    expect(fetched).toEqual(["https://cdn.example/a.png"]);
  });

  it("requires a session and membership, and never fetches for outsiders", async () => {
    const { t, link } = withImage(async () => {
      throw new Error("must not fetch");
    });
    expect((await get(t, link("https://cdn.example/a.png"), null)).statusCode).toBe(401);
    expect((await get(t, link("https://cdn.example/a.png"), "mallory")).statusCode).toBe(404);
  });

  it("404 for raw URLs, forged tokens and tokens issued for another workspace", async () => {
    const { t, link } = withImage(async () => {
      throw new Error("must not fetch");
    });
    const base = `/api/v1/workspaces/${WS}/mail/image`;
    expect((await get(t, `${base}?u=${encodeURIComponent("https://cdn.example/a.png")}`)).statusCode).toBe(404);
    expect((await get(t, `${link("https://cdn.example/a.png")}x`)).statusCode).toBe(404);
    const otherToken = new URL(link("https://cdn.example/a.png", OTHER_WS), "http://web.test").search;
    expect((await get(t, `${base}${otherToken}`)).statusCode).toBe(404);
    expect((await get(t, base)).statusCode).toBe(400);
  });

  it("404 when the guard blocks the address, 502 when the upstream fails", async () => {
    const blocked = withImage(async () => {
      throw new RemoteImageError("blocked", "address");
    });
    expect((await get(blocked.t, blocked.link("https://internal.example/a.png"))).statusCode).toBe(404);
    const failed = withImage(async () => {
      throw new RemoteImageError("failed", "content_type");
    });
    expect((await get(failed.t, failed.link("https://cdn.example/a.svg"))).statusCode).toBe(502);
  });
});

function inlineMessage(parts: object[]) {
  return {
    id: "m1",
    threadId: "thr-1",
    labelIds: ["INBOX"],
    snippet: "",
    internalDate: "1795000000000",
    payload: { mimeType: "multipart/related", headers: [{ name: "From", value: "Shop <news@shop.example>" }], parts },
  };
}

describe("GET /mail/messages/:messageId/inline/:contentId", () => {
  const url = (cid: string) => `/api/v1/workspaces/${WS}/mail/messages/m1/inline/${encodeURIComponent(cid)}`;

  async function connected(...handlers: FakeHandler[]) {
    const google = fakeFetch(...handlers);
    const t = setup({ members, fetch: google.impl });
    t.addUser("alice");
    t.addUser("mallory");
    await t.connect(KEY, { scopes: [GMAIL_READONLY] });
    return { t, google };
  }

  it("serves a part Gmail stored as an attachment", async () => {
    const { t, google } = await connected(
      gmailRoute(/\/messages\/m1$/, () =>
        json(200, inlineMessage([{ mimeType: "image/png", filename: "logo.png", headers: [{ name: "Content-ID", value: "<logo@shop>" }], body: { attachmentId: "att-9", size: png.length } }])),
      ),
      gmailRoute(/\/messages\/m1\/attachments\/att-9$/, () => json(200, { size: png.length, data: b64(png) })),
    );
    const res = await get(t, url("logo@shop"));
    expect(res.statusCode).toBe(200);
    expect(res.rawPayload).toEqual(png);
    expectImageHeaders(res.headers, "image/png");
    expect(google.calls.map((c) => c.url.pathname.split("/").slice(-2).join("/"))).toEqual(["messages/m1", "attachments/att-9"]);
  });

  it("serves small parts straight from the message body", async () => {
    const { t, google } = await connected(
      gmailRoute(/\/messages\/m1$/, () =>
        json(200, inlineMessage([{ mimeType: "image/gif", headers: [{ name: "Content-ID", value: "<dot>" }], body: { data: b64(png), size: png.length } }])),
      ),
    );
    const res = await get(t, url("dot"));
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("image/gif");
    expect(google.calls).toHaveLength(1);
  });

  it("404 for svg parts, unknown Content-IDs and outsiders", async () => {
    const { t } = await connected(
      gmailRoute(/\/messages\/m1$/, () =>
        json(200, inlineMessage([{ mimeType: "image/svg+xml", headers: [{ name: "Content-ID", value: "<vector>" }], body: { data: b64("<svg onload=alert(1)>") } }])),
      ),
    );
    expect((await get(t, url("vector"))).statusCode).toBe(404);
    expect((await get(t, url("missing"))).statusCode).toBe(404);
    expect((await get(t, url("vector"), "mallory")).statusCode).toBe(404);
  });

  it("409 when Gmail isn't connected", async () => {
    const t = setup({ members });
    t.addUser("alice");
    expect((await get(t, url("logo"))).statusCode).toBe(409);
  });
});

describe("GET /mail/threads/:threadId inline images", () => {
  it("rewrites cid: images to the inline route and leaves them out of attachments", async () => {
    const html = '<p>Hi</p><img src="cid:logo@shop"><img src="cid:not-in-message">';
    const google = fakeFetch(
      gmailRoute(/\/threads\/thr-1$/, () =>
        json(200, {
          id: "thr-1",
          messages: [
            inlineMessage([
              { mimeType: "text/html", body: { data: b64(html), size: html.length } },
              { mimeType: "image/png", filename: "logo.png", headers: [{ name: "Content-ID", value: "<logo@shop>" }], body: { attachmentId: "att-9", size: 10 } },
              { mimeType: "application/pdf", filename: "invoice.pdf", body: { attachmentId: "att-2", size: 2048 } },
            ]),
          ],
        }),
      ),
    );
    const t = setup({ members, fetch: google.impl });
    t.addUser("alice");
    await t.connect(KEY, { scopes: [GMAIL_READONLY] });
    const res = await get(t, `/api/v1/workspaces/${WS}/mail/threads/thr-1`);
    expect(res.statusCode).toBe(200);
    const [m] = res.json().messages;
    expect(m.html).toBe(`<p>Hi</p><img src="/api/v1/workspaces/${WS}/mail/messages/m1/inline/logo%40shop" />`);
    expect(m.hasBlockedImages).toBe(true);
    expect(m.attachments.map((a: { filename: string }) => a.filename)).toEqual(["invoice.pdf"]);
  });
});

describe("GET /mail/avatar", () => {
  const FAVICONS = "https://www.google.com/s2/favicons";
  const favicon = (respond: (call: FakeCall) => Response): FakeHandler => (call) => (call.url.href.startsWith(FAVICONS) ? respond(call) : undefined);

  function withFavicons(respond: (call: FakeCall) => Response) {
    const google = fakeFetch(favicon(respond));
    const t = setup({ fetch: google.impl });
    t.addUser("alice");
    return { t, google };
  }

  it("fetches the registrable domain's icon once, then serves it from the cache", async () => {
    const { t, google } = withFavicons(() => new Response(png, { status: 200, headers: { "content-type": "image/png" } }));
    const first = await get(t, "/api/v1/mail/avatar?domain=tm1.openai.com");
    expect(first.statusCode).toBe(200);
    expect(first.rawPayload).toEqual(png);
    expectImageHeaders(first.headers, "image/png");
    expect(google.calls[0]?.url.searchParams.get("domain")).toBe("openai.com");
    expect(google.calls[0]?.url.searchParams.get("sz")).toBe("64");

    const second = await get(t, "/api/v1/mail/avatar?domain=OpenAI.com");
    expect(second.statusCode).toBe(200);
    expect(second.rawPayload).toEqual(png);
    expect(google.calls).toHaveLength(1);
    expect(t.kv.data.has("mail:avatar:openai.com")).toBe(true);
  });

  it("404s and caches the miss when Google only has its placeholder", async () => {
    const { t, google } = withFavicons(() => new Response(png, { status: 404, headers: { "content-type": "image/png" } }));
    expect((await get(t, "/api/v1/mail/avatar?domain=unknown.example")).statusCode).toBe(404);
    const again = await get(t, "/api/v1/mail/avatar?domain=unknown.example");
    expect(again.statusCode).toBe(404);
    expect(again.headers["cache-control"]).toBe("private, max-age=86400");
    expect(google.calls).toHaveLength(1);
    expect(t.kv.data.get("mail:avatar:unknown.example")).toBe("miss");
  });

  it("doesn't cache outages or non-image answers as hits", async () => {
    const outage = withFavicons(() => new Response("", { status: 503 }));
    expect((await get(outage.t, "/api/v1/mail/avatar?domain=shop.example")).statusCode).toBe(404);
    expect(outage.t.kv.data.size).toBe(0);
    const svg = withFavicons(() => new Response("<svg/>", { status: 200, headers: { "content-type": "image/svg+xml" } }));
    expect((await get(svg.t, "/api/v1/mail/avatar?domain=shop.example")).statusCode).toBe(404);
    expect(svg.t.kv.data.get("mail:avatar:shop.example")).toBe("miss");
  });

  it("refetches when the cache entry is corrupt", async () => {
    const { t, google } = withFavicons(() => new Response(png, { status: 200, headers: { "content-type": "image/png" } }));
    t.kv.data.set("mail:avatar:shop.example", "{not json");
    expect((await get(t, "/api/v1/mail/avatar?domain=shop.example")).statusCode).toBe(200);
    expect(google.calls).toHaveLength(1);
  });

  it("401 without a session and 400 for anything that isn't a hostname", async () => {
    const { t, google } = withFavicons(() => new Response(png, { status: 200, headers: { "content-type": "image/png" } }));
    expect((await get(t, "/api/v1/mail/avatar?domain=openai.com", null)).statusCode).toBe(401);
    for (const domain of ["127.0.0.1", "localhost", "a..b.com", "evil.com/x", "evil.com:8080", "-bad.com", "x".repeat(64) + ".com"]) {
      expect((await get(t, `/api/v1/mail/avatar?domain=${encodeURIComponent(domain)}`)).statusCode).toBe(400);
    }
    expect(google.calls).toHaveLength(0);
  });
});
