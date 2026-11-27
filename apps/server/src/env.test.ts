import { describe, expect, it } from "vitest";
import { EnvError, loadEnv } from "./env";

const valid = {
  WEB_ORIGIN: "http://localhost:3000",
  DATABASE_URL: "postgres://u:p@localhost:5433/db",
  REDIS_URL: "redis://localhost:6379",
  BLOB_ENDPOINT: "http://localhost:9000",
  BLOB_BUCKET: "veritas",
  BLOB_ACCESS_KEY: "key",
  BLOB_SECRET_KEY: "super-secret-blob-value",
  AUTH_SECRET: "a".repeat(32),
  SMTP_HOST: "localhost",
  SMTP_PORT: "1025",
  MAIL_FROM: "Veritas <no-reply@veritas.local>",
  GEMINI_API_KEY: "secret-gemini-value",
  CONNECTOR_KEK: "b".repeat(32),
};

describe("loadEnv", () => {
  it("parses a complete environment", () => {
    expect(loadEnv(valid).API_PORT).toBe(4000);
  });

  it("names missing variables without echoing secret values", () => {
    const rest: Record<string, string> = { ...valid };
    delete rest.GEMINI_API_KEY;
    try {
      loadEnv({ ...rest, AUTH_SECRET: "short-secret-value" });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(EnvError);
      const message = (err as EnvError).message;
      expect(message).toContain("GEMINI_API_KEY is missing");
      expect(message).toContain("AUTH_SECRET must be at least 32 characters");
      expect(message).not.toContain("short-secret-value");
      expect(message).not.toContain("super-secret-blob-value");
    }
  });

  it("treats empty optional OAuth values as unset", () => {
    expect(loadEnv({ ...valid, GOOGLE_CLIENT_ID: "" }).GOOGLE_CLIENT_ID).toBeUndefined();
  });
});
