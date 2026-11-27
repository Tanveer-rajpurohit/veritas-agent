import { describe, expect, it } from "vitest";
import { formatAddress, formatRelativeTime, mailDocument, parseAddressList, replySubject, validateCompose } from "./mail-format";

describe("formatRelativeTime", () => {
  const now = new Date(2026, 10, 27, 15, 0, 0);
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

  it.each([
    [10_000, "Just now"],
    [-30_000, "Just now"],
    [5 * 60_000, "5m"],
    [59 * 60_000, "59m"],
    [3 * 3_600_000, "3h"],
    [2 * 86_400_000, "2d"],
  ])("shows %ims ago as %s", (ms, expected) => {
    expect(formatRelativeTime(ago(ms), now)).toBe(expected);
  });

  it("shows a date for anything older than a week", () => {
    expect(formatRelativeTime(new Date(2026, 9, 3, 9, 0).toISOString(), now)).toBe("Oct 3");
    expect(formatRelativeTime(new Date(2025, 9, 3, 9, 0).toISOString(), now)).toBe("Oct 3, 2025");
  });
});

describe("parseAddressList", () => {
  it("splits on commas, semicolons and new lines and pulls addresses out of display names", () => {
    expect(parseAddressList("a@example.com, Priya Shah <priya@example.in>;\nb@example.com")).toEqual({
      emails: ["a@example.com", "priya@example.in", "b@example.com"],
      invalid: [],
    });
  });

  it("drops duplicates case-insensitively and empty entries", () => {
    expect(parseAddressList("A@example.com,, a@example.com ,").emails).toEqual(["A@example.com"]);
  });

  it("keeps what isn't an address so the user can fix it", () => {
    expect(parseAddressList("ok@example.com, priya, Bad <nope>")).toEqual({ emails: ["ok@example.com"], invalid: ["priya", "Bad <nope>"] });
  });
});

describe("validateCompose", () => {
  const draft = { to: "a@example.com", cc: "", subject: "Term sheet", text: "Attached." };

  it("builds the send request", () => {
    const result = validateCompose({ ...draft, cc: "b@example.com" });
    expect(result).toEqual({ ok: true, input: { to: ["a@example.com"], cc: ["b@example.com"], subject: "Term sheet", text: "Attached." } });
  });

  it("carries reply threading through", () => {
    const result = validateCompose(draft, { inReplyToMessageId: "m1", threadId: "t1" });
    expect(result.ok && result.input.inReplyToMessageId).toBe("m1");
    expect(result.ok && result.input.threadId).toBe("t1");
  });

  it("asks for a recipient and names bad addresses", () => {
    expect(validateCompose({ ...draft, to: "" })).toEqual({ ok: false, errors: { to: "Add at least one recipient." } });
    expect(validateCompose({ ...draft, to: "priya" })).toEqual({ ok: false, errors: { to: '"priya" isn\'t a valid email address.' } });
    const cc = validateCompose({ ...draft, cc: "x, y" });
    expect(!cc.ok && cc.errors.cc).toBe("These aren't valid email addresses: x, y.");
  });

  it("refuses a message with neither subject nor body", () => {
    const result = validateCompose({ ...draft, subject: " ", text: "" });
    expect(!result.ok && result.errors.text).toBeTruthy();
  });

  it("enforces the API's recipient limit", () => {
    const to = Array.from({ length: 51 }, (_, i) => `p${i}@example.com`).join(",");
    const result = validateCompose({ ...draft, to });
    expect(!result.ok && result.errors.to).toBe("That's too many recipients for one message.");
  });
});

describe("small formatters", () => {
  it("formats addresses with and without names", () => {
    expect(formatAddress({ name: "Priya", email: "p@example.in" })).toBe("Priya <p@example.in>");
    expect(formatAddress({ name: "", email: "p@example.in" })).toBe("p@example.in");
  });

  it("adds Re: once", () => {
    expect(replySubject("Term sheet")).toBe("Re: Term sheet");
    expect(replySubject("RE: Term sheet")).toBe("RE: Term sheet");
  });

  it("locks the mail document down to inline content", () => {
    const doc = mailDocument("<p>Hi</p>");
    expect(doc).toContain("default-src 'none'");
    expect(doc).toContain("<p>Hi</p>");
  });
});
