import { describe, expect, it } from "vitest";
import { healthResponse } from "./health";

describe("healthResponse", () => {
  it("accepts a healthy payload", () => {
    expect(healthResponse.parse({ status: "ok", db: "ok", redis: "ok", blob: "ok" }).status).toBe("ok");
  });

  it("rejects unknown dependency states", () => {
    expect(() => healthResponse.parse({ status: "ok", db: "maybe", redis: "ok", blob: "ok" })).toThrow();
  });
});
