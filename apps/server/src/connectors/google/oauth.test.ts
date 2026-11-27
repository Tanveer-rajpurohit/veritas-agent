import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { GOOGLE, idToken, memoryKv } from "../test-harness";
import { consumeState, createPkce, emailFromIdToken, GMAIL_READONLY, GMAIL_SEND, saveState, scopesFor, shortScope } from "./oauth";

describe("google oauth helpers", () => {
  it("derives the S256 challenge from the verifier", () => {
    const { verifier, challenge } = createPkce();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(challenge).toBe(createHash("sha256").update(verifier).digest("base64url"));
  });

  it("maps features to the narrowest scopes", () => {
    expect(scopesFor(["gmail"])).toEqual(["openid", "email", GMAIL_READONLY]);
    expect(scopesFor(["gmail", "gmail_send", "gmail"])).toEqual(["openid", "email", GMAIL_READONLY, GMAIL_SEND]);
    expect(shortScope(GMAIL_SEND)).toBe("gmail.send");
  });

  it("stores state for 10 minutes and hands it out once", async () => {
    const kv = memoryKv();
    const ttls: number[] = [];
    const set = kv.set;
    kv.set = async (k, v, ttl) => {
      ttls.push(ttl);
      return set(k, v, ttl);
    };
    const data = { userId: "u", workspaceId: "w", verifier: "v", scopes: [GMAIL_READONLY] };
    const state = await saveState(kv, data);
    expect(ttls).toEqual([600]);
    expect(await consumeState(kv, state)).toEqual(data);
    expect(await consumeState(kv, state)).toBeNull();
  });

  it("ignores malformed state values and corrupt stored data", async () => {
    const kv = memoryKv();
    expect(await consumeState(kv, "../../etc")).toBeNull();
    const state = "a".repeat(43);
    kv.data.set(`oauth:google:state:${state}`, "{not json");
    expect(await consumeState(kv, state)).toBeNull();
  });

  it("reads the email from an ID token for this client only", () => {
    const claims = { iss: "https://accounts.google.com", aud: GOOGLE.clientId, email: "a@gmail.example", email_verified: true };
    expect(emailFromIdToken(idToken(claims), GOOGLE.clientId)).toBe("a@gmail.example");
    expect(emailFromIdToken(idToken({ ...claims, aud: "other" }), GOOGLE.clientId)).toBeNull();
    expect(emailFromIdToken(idToken({ ...claims, iss: "https://evil.example" }), GOOGLE.clientId)).toBeNull();
    expect(emailFromIdToken(idToken({ ...claims, email_verified: false }), GOOGLE.clientId)).toBeNull();
    expect(emailFromIdToken("garbage", GOOGLE.clientId)).toBeNull();
    expect(emailFromIdToken(undefined, GOOGLE.clientId)).toBeNull();
  });
});
