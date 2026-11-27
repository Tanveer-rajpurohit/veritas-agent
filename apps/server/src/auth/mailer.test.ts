import { describe, expect, it } from "vitest";
import { isReservedRecipient } from "./mailer";

describe("isReservedRecipient", () => {
  it.each([
    ["user-1@example.test", true],
    ["a@foo.example", true],
    ["a@x.invalid", true],
    ["a@host.localhost", true],
    ["name@gmail.com", false],
    ["name@test.com", false],
    ["name@example.com", false],
  ])("%s -> %s", (address, expected) => {
    expect(isReservedRecipient(address)).toBe(expected);
  });
});
