import { describe, expect, it } from "vitest";
import { GMAIL_READONLY, GMAIL_SEND } from "./google/oauth";
import { openTokens } from "./google/tokens";
import { fakeFetch, GOOGLE, idToken, json, setup, WEB, type FakeCall } from "./test-harness";

const WS = "0198f3a0-0000-7000-8000-000000000001";
const OTHER_WS = "0198f3a0-0000-7000-8000-000000000002";
const members = { [WS]: { alice: "owner" as const, bob: "viewer" as const }, [OTHER_WS]: { mallory: "owner" as const } };

const tokenEndpoint = (body: Record<string, unknown>, status = 200) => (call: FakeCall) =>
  call.url.href === "https://oauth2.googleapis.com/token" ? json(status, body) : undefined;

const grant = (scopes: string[], extra: Record<string, unknown> = {}) => ({
  access_token: "ya29.fresh-access",
  refresh_token: "1//fresh-refresh",
  expires_in: 3599,
  scope: scopes.join(" "),
  token_type: "Bearer",
  id_token: idToken({ iss: "https://accounts.google.com", aud: GOOGLE.clientId, email: "alice@gmail.example", email_verified: true }),
  ...extra,
});

async function start(t: ReturnType<typeof setup>, user = "alice", features = "gmail") {
  const app = await t.build();
  const res = await app.inject({
    method: "GET",
    url: `/api/v1/workspaces/${WS}/connectors/google/start?features=${features}`,
    headers: { "x-test-user": user },
  });
  return { app, res, location: res.headers.location ? new URL(String(res.headers.location)) : null };
}

describe("GET /connectors/google/start", () => {
  it("redirects to Google with narrow scopes, offline access, PKCE S256 and a stored state", async () => {
    const t = setup({ members });
    t.addUser("alice");
    const { res, location } = await start(t);
    expect(res.statusCode).toBe(302);
    expect(location!.origin + location!.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    const q = location!.searchParams;
    expect(q.get("scope")).toBe(`openid email ${GMAIL_READONLY}`);
    expect(q.get("access_type")).toBe("offline");
    expect(q.get("prompt")).toBe("consent");
    expect(q.get("include_granted_scopes")).toBe("true");
    expect(q.get("code_challenge_method")).toBe("S256");
    expect(q.get("code_challenge")).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(q.get("redirect_uri")).toBe(`${WEB}/api/v1/connectors/google/callback`);
    const stored = JSON.parse(t.kv.data.get(`oauth:google:state:${q.get("state")}`)!);
    expect(stored).toMatchObject({ userId: "alice", workspaceId: WS });
    expect(stored.verifier).not.toBe(q.get("code_challenge"));
  });

  it("asks for gmail.send only when sending is enabled", async () => {
    const t = setup({ members });
    t.addUser("alice");
    const { location } = await start(t, "alice", "gmail,gmail_send");
    expect(location!.searchParams.get("scope")).toBe(`openid email ${GMAIL_READONLY} ${GMAIL_SEND}`);
  });

  it("requires a session and membership (404 for other workspaces)", async () => {
    const t = setup({ members });
    t.addUser("mallory");
    const app = await t.build();
    const anon = await app.inject({ method: "GET", url: `/api/v1/workspaces/${WS}/connectors/google/start` });
    expect(anon.statusCode).toBe(401);
    const outsider = await app.inject({
      method: "GET",
      url: `/api/v1/workspaces/${WS}/connectors/google/start`,
      headers: { "x-test-user": "mallory" },
    });
    expect(outsider.statusCode).toBe(404);
  });

  it("rejects unknown features", async () => {
    const t = setup({ members });
    t.addUser("alice");
    const { res } = await start(t, "alice", "drive");
    expect(res.statusCode).toBe(400);
  });
});

describe("GET /connectors/google/callback", () => {
  async function callback(t: ReturnType<typeof setup>, query: string, user = "alice") {
    const app = await t.build();
    const res = await app.inject({ method: "GET", url: `/api/v1/connectors/google/callback?${query}`, headers: { "x-test-user": user } });
    return { res, location: String(res.headers.location ?? "") };
  }

  it("exchanges the code with the PKCE verifier, stores encrypted tokens, audits and redirects", async () => {
    const google = fakeFetch(tokenEndpoint(grant([GMAIL_READONLY, "openid", "https://www.googleapis.com/auth/userinfo.email"])));
    const t = setup({ members, fetch: google.impl });
    t.addUser("alice");
    const { location } = await start(t);
    const state = location!.searchParams.get("state")!;
    const verifier = JSON.parse(t.kv.data.get(`oauth:google:state:${state}`)!).verifier;

    const { res, location: back } = await callback(t, `state=${state}&code=auth-code-1`);
    expect(res.statusCode).toBe(302);
    expect(back).toBe(`${WEB}/w/${WS}/settings?connected=google`);

    const form = new URLSearchParams(google.calls[0]!.body);
    expect(form.get("code")).toBe("auth-code-1");
    expect(form.get("code_verifier")).toBe(verifier);
    expect(form.get("grant_type")).toBe("authorization_code");

    expect(t.rows).toHaveLength(1);
    const row = t.rows[0]!;
    expect(row.accountEmail).toBe("alice@gmail.example");
    expect(row.tokenCiphertext).not.toContain("ya29");
    expect(Buffer.from(row.tokenCiphertext, "base64").toString("latin1")).not.toContain("ya29");
    expect(openTokens(t.deps, row)).toEqual({ accessToken: "ya29.fresh-access", refreshToken: "1//fresh-refresh" });
    expect(t.audits).toEqual([expect.objectContaining({ action: "connector.connected", actorUserId: "alice", workspaceId: WS })]);
    expect(JSON.stringify(t.audits)).not.toMatch(/ya29|1\/\/fresh/);
  });

  it("is single use: replaying the state fails", async () => {
    const google = fakeFetch(tokenEndpoint(grant([GMAIL_READONLY])));
    const t = setup({ members, fetch: google.impl });
    t.addUser("alice");
    const state = (await start(t)).location!.searchParams.get("state")!;
    await callback(t, `state=${state}&code=c1`);
    const replay = await callback(t, `state=${state}&code=c1`);
    expect(replay.location).toBe(`${WEB}/?connector_error=state`);
    expect(google.calls).toHaveLength(1);
  });

  it("rejects a callback finished by a different session user", async () => {
    const google = fakeFetch(tokenEndpoint(grant([GMAIL_READONLY])));
    const t = setup({ members, fetch: google.impl });
    t.addUser("alice");
    t.addUser("bob");
    const state = (await start(t)).location!.searchParams.get("state")!;
    const { location } = await callback(t, `state=${state}&code=c1`, "bob");
    expect(location).toBe(`${WEB}/w/${WS}/settings?connector_error=session`);
    expect(google.calls).toHaveLength(0);
    expect(t.rows).toHaveLength(0);
  });

  it("rejects an unknown state", async () => {
    const t = setup({ members });
    t.addUser("alice");
    const { location } = await callback(t, `state=${"x".repeat(43)}&code=c1`);
    expect(location).toBe(`${WEB}/?connector_error=state`);
  });

  it("reports a cancelled consent without detail", async () => {
    const t = setup({ members });
    t.addUser("alice");
    const state = (await start(t)).location!.searchParams.get("state")!;
    const { location } = await callback(t, `state=${state}&error=access_denied`);
    expect(location).toBe(`${WEB}/w/${WS}/settings?connector_error=denied`);
  });

  it("refuses to connect when Gmail read access was not granted", async () => {
    const google = fakeFetch(tokenEndpoint(grant(["openid", "email"])));
    const t = setup({ members, fetch: google.impl });
    t.addUser("alice");
    const state = (await start(t)).location!.searchParams.get("state")!;
    const { location } = await callback(t, `state=${state}&code=c1`);
    expect(location).toBe(`${WEB}/w/${WS}/settings?connector_error=scope_denied`);
    expect(t.rows).toHaveLength(0);
  });

  it("hides Google's error detail when the exchange fails", async () => {
    const google = fakeFetch(tokenEndpoint({ error: "invalid_grant", error_description: "Bad Request secret detail" }, 400));
    const t = setup({ members, fetch: google.impl });
    t.addUser("alice");
    const state = (await start(t)).location!.searchParams.get("state")!;
    const { location } = await callback(t, `state=${state}&code=c1`);
    expect(location).toBe(`${WEB}/w/${WS}/settings?connector_error=failed`);
  });

  it("rejects an ID token issued to another client", async () => {
    const google = fakeFetch(
      tokenEndpoint(grant([GMAIL_READONLY], { id_token: idToken({ iss: "https://accounts.google.com", aud: "evil", email: "x@y.example" }) })),
    );
    const t = setup({ members, fetch: google.impl });
    t.addUser("alice");
    const state = (await start(t)).location!.searchParams.get("state")!;
    const { location } = await callback(t, `state=${state}&code=c1`);
    expect(location).toBe(`${WEB}/w/${WS}/settings?connector_error=failed`);
  });

  it("upserts on reconnect instead of adding a second row", async () => {
    const google = fakeFetch(tokenEndpoint(grant([GMAIL_READONLY, GMAIL_SEND])));
    const t = setup({ members, fetch: google.impl });
    t.addUser("alice");
    await t.connect({ workspaceId: WS, userId: "alice", provider: "google" }, { scopes: [GMAIL_READONLY] });
    t.rows[0]!.status = "needs_reconnect";
    const state = (await start(t, "alice", "gmail,gmail_send")).location!.searchParams.get("state")!;
    await callback(t, `state=${state}&code=c1`);
    expect(t.rows).toHaveLength(1);
    expect(t.rows[0]!.scopes).toContain(GMAIL_SEND);
    expect(t.rows[0]!.status).toBe("active");
  });
});

describe("GET /connectors and DELETE /connectors/google", () => {
  it("lists connectors without tokens and only for members", async () => {
    const t = setup({ members });
    t.addUser("alice");
    t.addUser("mallory");
    await t.connect({ workspaceId: WS, userId: "alice", provider: "google" }, { scopes: ["openid", GMAIL_READONLY] });
    const app = await t.build();
    const res = await app.inject({ method: "GET", url: `/api/v1/workspaces/${WS}/connectors`, headers: { "x-test-user": "alice" } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.connectors).toEqual([
      { provider: "google", accountEmail: "me@gmail.example", scopes: ["openid", GMAIL_READONLY], connectedAt: expect.any(String), status: "active" },
    ]);
    expect(res.body).not.toMatch(/ya29|refresh|ciphertext/i);
    const outsider = await app.inject({ method: "GET", url: `/api/v1/workspaces/${WS}/connectors`, headers: { "x-test-user": "mallory" } });
    expect(outsider.statusCode).toBe(404);
  });

  it("revokes at Google, deletes the row and audits", async () => {
    const google = fakeFetch((c) => (c.url.href === "https://oauth2.googleapis.com/revoke" ? new Response(null, { status: 200 }) : undefined));
    const t = setup({ members, fetch: google.impl });
    t.addUser("alice");
    await t.connect({ workspaceId: WS, userId: "alice", provider: "google" }, { scopes: [GMAIL_READONLY], refreshToken: "1//to-revoke" });
    const app = await t.build();
    const res = await app.inject({ method: "DELETE", url: `/api/v1/workspaces/${WS}/connectors/google`, headers: { "x-test-user": "alice" } });
    expect(res.statusCode).toBe(204);
    expect(new URLSearchParams(google.calls[0]!.body).get("token")).toBe("1//to-revoke");
    expect(t.rows).toHaveLength(0);
    expect(t.audits).toEqual([expect.objectContaining({ action: "connector.disconnected" })]);
  });

  it("still disconnects when Google's revoke fails", async () => {
    const google = fakeFetch(() => json(503, {}));
    const t = setup({ members, fetch: google.impl });
    t.addUser("alice");
    await t.connect({ workspaceId: WS, userId: "alice", provider: "google" }, { scopes: [GMAIL_READONLY] });
    const app = await t.build();
    const res = await app.inject({ method: "DELETE", url: `/api/v1/workspaces/${WS}/connectors/google`, headers: { "x-test-user": "alice" } });
    expect(res.statusCode).toBe(204);
    expect(t.rows).toHaveLength(0);
  });

  it("does not revoke a grant another workspace still uses", async () => {
    const google = fakeFetch();
    const t = setup({ members: { ...members, [OTHER_WS]: { alice: "owner" } }, fetch: google.impl });
    t.addUser("alice");
    await t.connect({ workspaceId: WS, userId: "alice", provider: "google" }, { scopes: [GMAIL_READONLY] });
    await t.connect({ workspaceId: OTHER_WS, userId: "alice", provider: "google" }, { scopes: [GMAIL_READONLY] });
    const app = await t.build();
    const res = await app.inject({ method: "DELETE", url: `/api/v1/workspaces/${WS}/connectors/google`, headers: { "x-test-user": "alice" } });
    expect(res.statusCode).toBe(204);
    expect(google.calls).toHaveLength(0);
    expect(t.rows).toHaveLength(1);
  });
});
