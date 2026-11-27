import { describe, expect, it } from "vitest";
import type { ConnectorSummary } from "@veritas/shared";
import { connectNoticeFrom, describeScopes, GMAIL_READ_SCOPE, GMAIL_SEND_SCOPE, googleConnection, googleConnectUrl } from "./google-connector";

const google = (overrides: Partial<ConnectorSummary> = {}): ConnectorSummary => ({
  provider: "google",
  accountEmail: "priya@example.in",
  scopes: ["openid", "email", GMAIL_READ_SCOPE],
  connectedAt: "2026-11-27T10:00:00.000Z",
  status: "active",
  ...overrides,
});

describe("googleConnection", () => {
  it("is not connected without a Google connector", () => {
    expect(googleConnection([])).toEqual({ kind: "not_connected" });
  });

  it("reads mail but needs the send scope before it can send", () => {
    expect(googleConnection([google()])).toMatchObject({ kind: "connected", canSend: false });
    expect(googleConnection([google({ scopes: [GMAIL_READ_SCOPE, GMAIL_SEND_SCOPE] })])).toMatchObject({ kind: "connected", canSend: true });
  });

  it("asks to reconnect when Google revoked access or read access is missing", () => {
    expect(googleConnection([google({ status: "needs_reconnect" })]).kind).toBe("needs_reconnect");
    expect(googleConnection([google({ scopes: ["openid", GMAIL_SEND_SCOPE] })]).kind).toBe("needs_reconnect");
  });
});

describe("googleConnectUrl", () => {
  it("asks only for the features requested", () => {
    expect(googleConnectUrl("ws-1", ["gmail"])).toBe("/api/v1/workspaces/ws-1/connectors/google/start?features=gmail");
    expect(googleConnectUrl("ws-1", ["gmail", "gmail_send"])).toBe("/api/v1/workspaces/ws-1/connectors/google/start?features=gmail,gmail_send");
  });
});

describe("describeScopes", () => {
  it("puts Gmail scopes in plain words and hides sign-in scopes", () => {
    expect(describeScopes(["openid", "email", GMAIL_READ_SCOPE, GMAIL_SEND_SCOPE])).toEqual(["Read your Gmail", "Send mail as you"]);
  });
});

describe("connectNoticeFrom", () => {
  it("reports success, specific errors, and falls back for unknown codes", () => {
    expect(connectNoticeFrom(new URLSearchParams("connected=google"))?.tone).toBe("success");
    expect(connectNoticeFrom(new URLSearchParams("connector_error=denied"))?.text).toMatch(/didn't give Veritas access/);
    expect(connectNoticeFrom(new URLSearchParams("connector_error=scope_denied"))?.text).toMatch(/Gmail box ticked/);
    expect(connectNoticeFrom(new URLSearchParams("connector_error=weird"))?.text).toMatch(/didn't finish/);
    expect(connectNoticeFrom(new URLSearchParams(""))).toBeNull();
  });
});
