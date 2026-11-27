import { describe, expect, it } from "vitest";
import { ConnectorError } from "../context";
import { fakeFetch, json, setup, type FakeCall } from "../test-harness";
import { GMAIL_READONLY } from "./oauth";
import { getAccessToken, openTokens, REFRESH_SKEW_MS } from "./tokens";

const KEY = { workspaceId: "ws-1", userId: "alice", provider: "google" as const };
const NOW = 1_800_000_000_000;

function refreshEndpoint(respond: () => Response) {
  return (call: FakeCall) => (call.url.href === "https://oauth2.googleapis.com/token" ? respond() : undefined);
}

describe("getAccessToken", () => {
  it("returns the stored token while it is fresh", async () => {
    const google = fakeFetch();
    const t = setup({ fetch: google.impl, now: () => NOW });
    await t.connect(KEY, { scopes: [GMAIL_READONLY], expiresAt: new Date(NOW + REFRESH_SKEW_MS + 5_000) });
    expect(await getAccessToken(t.deps, (await t.store.find(KEY))!)).toBe("ya29.access-1");
    expect(google.calls).toHaveLength(0);
  });

  it("refreshes within 60 s of expiry, keeps the refresh token and stores the new expiry", async () => {
    const google = fakeFetch(refreshEndpoint(() => json(200, { access_token: "ya29.access-2", expires_in: 3600, scope: GMAIL_READONLY })));
    const t = setup({ fetch: google.impl, now: () => NOW });
    await t.connect(KEY, { scopes: [GMAIL_READONLY], expiresAt: new Date(NOW + 30_000) });
    expect(await getAccessToken(t.deps, (await t.store.find(KEY))!)).toBe("ya29.access-2");
    const form = new URLSearchParams(google.calls[0]!.body);
    expect(form.get("grant_type")).toBe("refresh_token");
    expect(form.get("refresh_token")).toBe("1//refresh-1");
    const row = (await t.store.find(KEY))!;
    expect(openTokens(t.deps, row)).toEqual({ accessToken: "ya29.access-2", refreshToken: "1//refresh-1" });
    expect(row.expiresAt!.getTime()).toBe(NOW + 3600_000);
  });

  it("refreshes once for concurrent callers", async () => {
    let refreshes = 0;
    const google = fakeFetch(
      refreshEndpoint(() => {
        refreshes++;
        return json(200, { access_token: `ya29.access-r${refreshes}`, expires_in: 3600 });
      }),
    );
    const t = setup({ fetch: google.impl, now: () => NOW });
    await t.connect(KEY, { scopes: [GMAIL_READONLY], expiresAt: new Date(NOW - 1) });
    const stale = (await t.store.find(KEY))!;
    const tokens = await Promise.all(Array.from({ length: 5 }, () => getAccessToken(t.deps, stale)));
    expect(refreshes).toBe(1);
    expect(new Set(tokens)).toEqual(new Set(["ya29.access-r1"]));
  });

  it("forces a refresh past a token Google rejected", async () => {
    const google = fakeFetch(refreshEndpoint(() => json(200, { access_token: "ya29.access-2", expires_in: 3600 })));
    const t = setup({ fetch: google.impl, now: () => NOW });
    await t.connect(KEY, { scopes: [GMAIL_READONLY] });
    expect(await getAccessToken(t.deps, (await t.store.find(KEY))!, "ya29.access-1")).toBe("ya29.access-2");
  });

  it("marks the connector needs_reconnect on invalid_grant", async () => {
    const google = fakeFetch(refreshEndpoint(() => json(400, { error: "invalid_grant" })));
    const t = setup({ fetch: google.impl, now: () => NOW });
    await t.connect(KEY, { scopes: [GMAIL_READONLY], expiresAt: new Date(NOW - 1) });
    await expect(getAccessToken(t.deps, (await t.store.find(KEY))!)).rejects.toMatchObject({ kind: "needs_reconnect" });
    expect((await t.store.find(KEY))!.status).toBe("needs_reconnect");
    expect(t.kv.data.size).toBe(0); // lock released
  });

  it("treats a Google outage as unavailable without touching the connector", async () => {
    const google = fakeFetch(refreshEndpoint(() => json(503, {})));
    const t = setup({ fetch: google.impl, now: () => NOW });
    await t.connect(KEY, { scopes: [GMAIL_READONLY], expiresAt: new Date(NOW - 1) });
    const err = await getAccessToken(t.deps, (await t.store.find(KEY))!).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ConnectorError);
    expect((err as ConnectorError).kind).toBe("unavailable");
    expect((await t.store.find(KEY))!.status).toBe("active");
  });
});
