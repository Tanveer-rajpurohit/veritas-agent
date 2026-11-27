import { describe, expect, it } from "vitest";
import { THREAD_FETCH_CONCURRENCY, THREADS_PAGE_SIZE } from "../connectors/google/gmail";
import { GMAIL_READONLY, GMAIL_SEND } from "../connectors/google/oauth";
import { fakeFetch, json, setup, type FakeCall, type FakeHandler } from "../connectors/test-harness";

const WS = "0198f3a0-0000-7000-8000-000000000001";
const OTHER_WS = "0198f3a0-0000-7000-8000-000000000002";
const members = { [WS]: { alice: "owner" as const }, [OTHER_WS]: { mallory: "owner" as const } };
const KEY = { workspaceId: WS, userId: "alice", provider: "google" as const };
const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";
const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");

const route = (method: string, path: RegExp, respond: (call: FakeCall) => Response): FakeHandler => (call) =>
  call.method === method && call.url.href.startsWith(GMAIL) && path.test(call.url.pathname) ? respond(call) : undefined;

function metaThread(id: string, opts: { unread?: boolean; mixed?: boolean } = {}) {
  return {
    id,
    messages: [
      {
        id: `${id}-m1`,
        threadId: id,
        labelIds: ["INBOX"],
        snippet: "first",
        internalDate: "1795000000000",
        payload: { mimeType: "text/plain", headers: [{ name: "Subject", value: `Subject ${id}` }, { name: "From", value: "Old <old@example.test>" }] },
      },
      {
        id: `${id}-m2`,
        threadId: id,
        labelIds: opts.unread ? ["INBOX", "UNREAD"] : ["INBOX"],
        snippet: "It&#39;s &amp; done",
        internalDate: "1795000600000",
        payload: {
          mimeType: opts.mixed ? "multipart/mixed" : "text/plain",
          headers: [{ name: "From", value: '"Jane Doe" <jane@example.test>' }],
        },
      },
    ],
  };
}

async function request(t: ReturnType<typeof setup>, method: "GET" | "POST", url: string, payload?: unknown, user = "alice") {
  const app = await t.build();
  return app.inject({ method, url, payload: payload as Record<string, unknown> | undefined, headers: { "x-test-user": user } });
}

describe("mail routes: access", () => {
  it("401 without a session, 404 outside the workspace", async () => {
    const t = setup({ members });
    t.addUser("mallory");
    const app = await t.build();
    expect((await app.inject({ method: "GET", url: `/api/v1/workspaces/${WS}/mail/threads` })).statusCode).toBe(401);
    expect((await request(t, "GET", `/api/v1/workspaces/${WS}/mail/threads`, undefined, "mallory")).statusCode).toBe(404);
  });

  it("409 connect:true when no Google account is connected", async () => {
    const t = setup({ members });
    t.addUser("alice");
    const res = await request(t, "GET", `/api/v1/workspaces/${WS}/mail/threads`);
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ error: "Connect your Google account to use Mail.", connect: true });
  });

  it("409 connect:true when the connection needs reconnecting", async () => {
    const t = setup({ members });
    t.addUser("alice");
    await t.connect(KEY, { scopes: [GMAIL_READONLY] });
    t.rows[0]!.status = "needs_reconnect";
    const res = await request(t, "GET", `/api/v1/workspaces/${WS}/mail/threads`);
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ connect: true });
  });

  it("409 needsScope when Gmail read access is missing", async () => {
    const t = setup({ members });
    t.addUser("alice");
    await t.connect(KEY, { scopes: ["openid"] });
    const res = await request(t, "GET", `/api/v1/workspaces/${WS}/mail/threads`);
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ connect: true, needsScope: "gmail.readonly" });
  });
});

describe("GET /mail/threads", () => {
  it("lists then fetches metadata with a concurrency cap and maps summaries", async () => {
    const ids = Array.from({ length: 20 }, (_, i) => `t${i}`);
    let inFlight = 0;
    let peak = 0;
    const google = fakeFetch(
      route("GET", /\/threads$/, () => json(200, { threads: ids.map((id) => ({ id })), nextPageToken: "next-1" })),
      route("GET", /\/threads\/[^/]+$/, (call) => {
        inFlight++;
        peak = Math.max(peak, inFlight);
        const id = call.url.pathname.split("/").at(-1)!;
        // Resolve on a later tick so calls overlap and the cap is observable.
        const body = JSON.stringify(metaThread(id, { unread: id === "t0", mixed: id === "t1" }));
        return new Response(
          new ReadableStream({
            start(controller) {
              setTimeout(() => {
                inFlight--;
                controller.enqueue(new TextEncoder().encode(body));
                controller.close();
              }, 5);
            },
          }),
          { status: 200 },
        );
      }),
    );
    const t = setup({ members, fetch: google.impl });
    t.addUser("alice");
    await t.connect(KEY, { scopes: [GMAIL_READONLY], accessToken: "ya29.list" });

    const res = await request(t, "GET", `/api/v1/workspaces/${WS}/mail/threads?label=INBOX&q=from:jane`);
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.nextPageToken).toBe("next-1");
    expect(body.threads).toHaveLength(20);
    expect(body.threads[0]).toEqual({
      id: "t0",
      from: { name: "Jane Doe", email: "jane@example.test" },
      subject: "Subject t0",
      snippet: "It's & done",
      lastMessageAt: new Date(1795000600000).toISOString(),
      isUnread: true,
      hasAttachments: false,
      messageCount: 2,
    });
    expect(body.threads[1].hasAttachments).toBe(true);
    expect(body.threads[1].isUnread).toBe(false);

    const list = google.calls[0]!;
    expect(list.url.searchParams.get("labelIds")).toBe("INBOX");
    expect(list.url.searchParams.get("q")).toBe("from:jane");
    expect(list.url.searchParams.get("maxResults")).toBe(String(THREADS_PAGE_SIZE));
    expect(list.headers.get("authorization")).toBe("Bearer ya29.list");
    expect(google.calls[1]!.url.searchParams.get("format")).toBe("metadata");
    expect(peak).toBeLessThanOrEqual(THREAD_FETCH_CONCURRENCY);
    expect(peak).toBeGreaterThan(1);
  });

  it("rejects malformed labels and page tokens", async () => {
    const t = setup({ members });
    t.addUser("alice");
    expect((await request(t, "GET", `/api/v1/workspaces/${WS}/mail/threads?label=../x`)).statusCode).toBe(400);
    expect((await request(t, "GET", `/api/v1/workspaces/${WS}/mail/threads?pageToken=a%20b`)).statusCode).toBe(400);
  });

  it("refreshes once and retries when Gmail answers 401", async () => {
    const google = fakeFetch(
      (call) =>
        call.url.href === "https://oauth2.googleapis.com/token" ? json(200, { access_token: "ya29.new", expires_in: 3600 }) : undefined,
      route("GET", /\/threads$/, (call) =>
        call.headers.get("authorization") === "Bearer ya29.new" ? json(200, { threads: [] }) : json(401, { error: { code: 401 } }),
      ),
    );
    const t = setup({ members, fetch: google.impl });
    t.addUser("alice");
    await t.connect(KEY, { scopes: [GMAIL_READONLY], accessToken: "ya29.revoked" });
    const res = await request(t, "GET", `/api/v1/workspaces/${WS}/mail/threads`);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ threads: [], nextPageToken: null });
    expect(google.calls.map((c) => c.url.pathname)).toEqual(["/gmail/v1/users/me/threads", "/token", "/gmail/v1/users/me/threads"]);
  });

  it("asks to reconnect when the retry is also rejected", async () => {
    const google = fakeFetch(
      (call) =>
        call.url.href === "https://oauth2.googleapis.com/token" ? json(200, { access_token: "ya29.new", expires_in: 3600 }) : undefined,
      route("GET", /\/threads$/, () => json(401, {})),
    );
    const t = setup({ members, fetch: google.impl });
    t.addUser("alice");
    await t.connect(KEY, { scopes: [GMAIL_READONLY] });
    const res = await request(t, "GET", `/api/v1/workspaces/${WS}/mail/threads`);
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ connect: true });
  });

  it("maps 403 insufficient scope to 409 needsScope", async () => {
    const google = fakeFetch(
      route("GET", /\/threads$/, () => json(403, { error: { code: 403, status: "PERMISSION_DENIED", details: [{ reason: "ACCESS_TOKEN_SCOPE_INSUFFICIENT" }] } })),
    );
    const t = setup({ members, fetch: google.impl });
    t.addUser("alice");
    await t.connect(KEY, { scopes: [GMAIL_READONLY] });
    const res = await request(t, "GET", `/api/v1/workspaces/${WS}/mail/threads`);
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ needsScope: "gmail.readonly" });
  });

  it.each([429, 500, 503])("maps Gmail %i to a calm 503", async (status) => {
    const google = fakeFetch(route("GET", /\/threads$/, () => json(status, { error: { message: "internal detail" } })));
    const t = setup({ members, fetch: google.impl });
    t.addUser("alice");
    await t.connect(KEY, { scopes: [GMAIL_READONLY] });
    const res = await request(t, "GET", `/api/v1/workspaces/${WS}/mail/threads`);
    expect(res.statusCode).toBe(503);
    expect(res.json().error).toBe("Gmail isn't responding right now. Try again in a minute.");
    expect(res.body).not.toContain("internal detail");
  });

  it("maps a network failure to 503", async () => {
    const t = setup({
      members,
      fetch: async () => {
        throw new TypeError("fetch failed");
      },
    });
    t.addUser("alice");
    await t.connect(KEY, { scopes: [GMAIL_READONLY] });
    expect((await request(t, "GET", `/api/v1/workspaces/${WS}/mail/threads`)).statusCode).toBe(503);
  });
});

describe("GET /mail/threads/:threadId", () => {
  it("returns headers, text, sanitized HTML and attachment metadata", async () => {
    const html = '<p onclick="x()">Hello <a href="https://example.test">link</a></p><img src="https://t.example/p.gif"><script>alert(1)</script>';
    const google = fakeFetch(
      route("GET", /\/threads\/thr-1$/, (call) => {
        expect(call.url.searchParams.get("format")).toBe("full");
        return json(200, {
          id: "thr-1",
          messages: [
            {
              id: "m1",
              threadId: "thr-1",
              labelIds: ["INBOX", "UNREAD"],
              snippet: "Hello",
              internalDate: "1795000000000",
              payload: {
                mimeType: "multipart/mixed",
                headers: [
                  { name: "From", value: "Jane <jane@example.test>" },
                  { name: "To", value: '"Doe, John" <john@example.test>, me@gmail.example' },
                  { name: "Subject", value: "Contract" },
                  { name: "Message-ID", value: "<abc@mail.example>" },
                ],
                parts: [
                  {
                    mimeType: "multipart/alternative",
                    parts: [
                      { mimeType: "text/plain", body: { data: b64("Hello link"), size: 10 } },
                      { mimeType: "text/html", body: { data: b64(html), size: html.length } },
                    ],
                  },
                  { mimeType: "application/pdf", filename: "nda.pdf", body: { attachmentId: "att-1", size: 2048 } },
                ],
              },
            },
          ],
        });
      }),
    );
    const t = setup({ members, fetch: google.impl });
    t.addUser("alice");
    await t.connect(KEY, { scopes: [GMAIL_READONLY] });
    const res = await request(t, "GET", `/api/v1/workspaces/${WS}/mail/threads/thr-1`);
    expect(res.statusCode).toBe(200);
    const { subject, messages } = res.json();
    expect(subject).toBe("Contract");
    const [m] = messages;
    expect(m.to).toEqual([
      { name: "Doe, John", email: "john@example.test" },
      { name: "", email: "me@gmail.example" },
    ]);
    expect(m.text).toBe("Hello link");
    expect(m.html).toMatch(
      new RegExp(
        `^<p>Hello <a href="https://example.test" rel="noopener noreferrer" target="_blank">link</a></p><img src="/api/v1/workspaces/${WS}/mail/image\\?u=[\\w-]+\\.[\\w-]+" />$`,
      ),
    );
    expect(m.hasBlockedImages).toBe(false);
    expect(m.messageIdHeader).toBe("<abc@mail.example>");
    expect(m.isUnread).toBe(true);
    expect(m.attachments).toEqual([{ id: "att-1", filename: "nda.pdf", mimeType: "application/pdf", size: 2048 }]);
  });

  it("404 when the thread is gone", async () => {
    const google = fakeFetch(route("GET", /\/threads\/gone$/, () => json(404, {})));
    const t = setup({ members, fetch: google.impl });
    t.addUser("alice");
    await t.connect(KEY, { scopes: [GMAIL_READONLY] });
    expect((await request(t, "GET", `/api/v1/workspaces/${WS}/mail/threads/gone`)).statusCode).toBe(404);
  });
});

describe("POST /mail/send", () => {
  const input = { to: ["bob@example.test"], cc: [], subject: "Re: Contract", text: "Looks good." };

  it("409 needsScope gmail.send until sending is enabled, and calls nothing", async () => {
    const google = fakeFetch();
    const t = setup({ members, fetch: google.impl });
    t.addUser("alice");
    await t.connect(KEY, { scopes: [GMAIL_READONLY] });
    const res = await request(t, "POST", `/api/v1/workspaces/${WS}/mail/send`, input);
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ needsScope: "gmail.send", connect: true });
    expect(google.calls).toHaveLength(0);
  });

  it("sends a reply in the thread with reply headers and audits without content", async () => {
    let raw = "";
    const google = fakeFetch(
      route("GET", /\/messages\/orig-1$/, () =>
        json(200, {
          id: "orig-1",
          threadId: "thr-9",
          payload: { headers: [{ name: "Message-ID", value: "<orig@mail.example>" }, { name: "References", value: "<root@mail.example>" }] },
        }),
      ),
      route("POST", /\/messages\/send$/, (call) => {
        const body = JSON.parse(call.body);
        raw = Buffer.from(body.raw, "base64url").toString("utf8");
        expect(body.threadId).toBe("thr-9");
        return json(200, { id: "sent-1", threadId: "thr-9", labelIds: ["SENT"] });
      }),
    );
    const t = setup({ members, fetch: google.impl });
    t.addUser("alice");
    await t.connect(KEY, { scopes: [GMAIL_READONLY, GMAIL_SEND] });
    const res = await request(t, "POST", `/api/v1/workspaces/${WS}/mail/send`, { ...input, inReplyToMessageId: "orig-1" });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ id: "sent-1", threadId: "thr-9" });
    expect(raw).toContain("In-Reply-To: <orig@mail.example>\r\n");
    expect(raw).toContain("References: <root@mail.example> <orig@mail.example>\r\n");
    expect(raw).toContain("From: me@gmail.example\r\n");
    expect(t.audits).toEqual([
      expect.objectContaining({ action: "mail.sent", target: "sent-1", workspaceId: WS, actorUserId: "alice" }),
    ]);
    expect(JSON.stringify(t.audits)).not.toContain("Looks good");
  });

  it("rejects header injection in the subject with 400", async () => {
    const google = fakeFetch();
    const t = setup({ members, fetch: google.impl });
    t.addUser("alice");
    await t.connect(KEY, { scopes: [GMAIL_READONLY, GMAIL_SEND] });
    const res = await request(t, "POST", `/api/v1/workspaces/${WS}/mail/send`, { ...input, subject: "Hi\r\nBcc: victim@example.test" });
    expect(res.statusCode).toBe(400);
    expect(res.json().fields).toHaveProperty("subject");
    expect(google.calls).toHaveLength(0);
  });

  it("validates recipients", async () => {
    const t = setup({ members });
    t.addUser("alice");
    expect((await request(t, "POST", `/api/v1/workspaces/${WS}/mail/send`, { ...input, to: [] })).statusCode).toBe(400);
    expect((await request(t, "POST", `/api/v1/workspaces/${WS}/mail/send`, { ...input, to: ["not-an-email"] })).statusCode).toBe(400);
  });
});
