import { describe, expect, it } from "vitest";
import { buildMimeMessage, MimeError, toGmailRaw } from "./mime";

const base = { to: ["bob@example.test"], cc: [], subject: "Hello", text: "Hi Bob", date: new Date("2026-11-27T10:00:00Z") };

function split(mime: string) {
  const [head, body] = mime.split("\r\n\r\n");
  return { headers: head!.split("\r\n"), body: body! };
}

describe("buildMimeMessage", () => {
  it("builds CRLF headers and a base64 UTF-8 body", () => {
    const mime = buildMimeMessage({ ...base, from: "me@gmail.example", cc: ["c@example.test", "d@example.test"], text: "Line 1\nLine 2 ✓" });
    const { headers, body } = split(mime);
    expect(headers).toEqual([
      "From: me@gmail.example",
      "To: bob@example.test",
      "Cc: c@example.test, d@example.test",
      "Subject: Hello",
      "Date: Fri, 27 Nov 2026 10:00:00 GMT",
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
    ]);
    expect(Buffer.from(body.replace(/\r\n/g, ""), "base64").toString("utf8")).toBe("Line 1\r\nLine 2 ✓");
    expect(mime).not.toMatch(/[^\r]\n/);
  });

  it("wraps long bodies at 76 characters", () => {
    const { body } = split(buildMimeMessage({ ...base, text: "x".repeat(500) }));
    for (const line of body.trimEnd().split("\r\n")) expect(line.length).toBeLessThanOrEqual(76);
  });

  it("encodes non-ASCII subjects as RFC 2047 words", () => {
    const { headers } = split(buildMimeMessage({ ...base, subject: "Café ₹ invoice" }));
    const subject = headers.find((h) => h.startsWith("Subject: "))!;
    expect(subject).toBe(`Subject: =?UTF-8?B?${Buffer.from("Café ₹ invoice").toString("base64")}?=`);
  });

  it("adds reply headers", () => {
    const { headers } = split(buildMimeMessage({ ...base, inReplyTo: "<a@mail.gmail.com>", references: "<z@x> <a@mail.gmail.com>" }));
    expect(headers).toContain("In-Reply-To: <a@mail.gmail.com>");
    expect(headers).toContain("References: <z@x> <a@mail.gmail.com>");
  });

  it.each([
    ["subject", { subject: "Hi\r\nBcc: victim@example.test" }],
    ["subject", { subject: "Hi\nBcc: victim@example.test" }],
    ["to", { to: ["bob@example.test\r\nBcc: victim@example.test"] }],
    ["cc", { cc: ["c@example.test\nX-Evil: 1"] }],
    ["inReplyTo", { inReplyTo: "<a@b>\r\nBcc: v@example.test" }],
  ])("rejects CR/LF header injection in %s", (field, patch) => {
    try {
      buildMimeMessage({ ...base, ...patch });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(MimeError);
      expect((err as MimeError).field).toBe(field);
    }
  });

  it("rejects display names and address lists smuggled into one recipient", () => {
    expect(() => buildMimeMessage({ ...base, to: ["Bob <bob@example.test>"] })).toThrow(MimeError);
    expect(() => buildMimeMessage({ ...base, to: ["a@example.test, b@example.test"] })).toThrow(MimeError);
  });

  it("allows line breaks in the body", () => {
    expect(() => buildMimeMessage({ ...base, text: "a\r\nBcc: not-a-header" })).not.toThrow();
  });

  it("encodes the raw message as base64url", () => {
    const raw = toGmailRaw(buildMimeMessage(base));
    expect(raw).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
