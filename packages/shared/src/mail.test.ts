import { describe, expect, it } from "vitest";
import { avatarDomain, mailAvatarQuery, registrableDomain } from "./mail";

describe("registrableDomain", () => {
  it.each([
    ["openai.com", "openai.com"],
    ["tm1.openai.com", "openai.com"],
    ["a.b.mail.github.com", "github.com"],
    ["mail.example.co.uk", "example.co.uk"],
    ["example.co.uk", "example.co.uk"],
    ["alerts.hdfcbank.co.in", "hdfcbank.co.in"],
    ["mail.service.gov.in", "service.gov.in"],
    ["news.shop.com.au", "shop.com.au"],
    ["mail.co.com", "co.com"],
  ])("%s -> %s", (host, expected) => {
    expect(registrableDomain(host)).toBe(expected);
  });
});

describe("avatarDomain", () => {
  it("uses the registrable part of the address's domain", () => {
    expect(avatarDomain("noreply@tm1.openai.com")).toBe("openai.com");
    expect(avatarDomain("Billing@Mail.Stripe.COM")).toBe("stripe.com");
  });

  it("returns null for personal mailbox providers and malformed addresses", () => {
    expect(avatarDomain("jane@gmail.com")).toBeNull();
    expect(avatarDomain("jane@outlook.com")).toBeNull();
    expect(avatarDomain("not-an-address")).toBeNull();
    expect(avatarDomain("x@localhost")).toBeNull();
    expect(avatarDomain("x@[127.0.0.1]")).toBeNull();
    expect(avatarDomain("x@10.0.0.1")).toBeNull();
  });
});

describe("mailAvatarQuery", () => {
  it("lowercases valid hostnames and rejects anything else", () => {
    expect(mailAvatarQuery.parse({ domain: " OpenAI.com " }).domain).toBe("openai.com");
    for (const domain of ["127.0.0.1", "localhost", "a..b.com", "evil.com/x", "evil.com:80", "-x.com", "x_y.com"]) {
      expect(mailAvatarQuery.safeParse({ domain }).success).toBe(false);
    }
  });
});
