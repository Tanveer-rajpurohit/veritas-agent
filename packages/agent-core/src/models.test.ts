import { describe, expect, it, vi } from "vitest";
import { createModelRegistry, fetchGeminiModels, ModelProviderError, PROVIDER_UNAVAILABLE_MESSAGE, rankModels, type GeminiModel } from "./models";

const chat = (name: string, extra: Partial<GeminiModel> = {}): GeminiModel => ({
  name: `models/${name}`,
  displayName: name.toUpperCase(),
  inputTokenLimit: 1_000_000,
  outputTokenLimit: 65_536,
  supportedGenerationMethods: ["generateContent", "countTokens"],
  ...extra,
});

const FIXTURE: GeminiModel[] = [
  chat("gemini-2.0-flash"),
  chat("gemini-2.5-flash"),
  chat("gemini-2.5-flash-lite"),
  chat("gemini-2.5-pro"),
  chat("gemini-3-pro-preview"),
  chat("gemini-3-flash-preview"),
  chat("gemini-2.5-flash-preview-tts"),
  chat("gemini-3-pro-image-preview"),
  chat("gemini-flash-latest"),
  chat("gemma-3-27b-it"),
  chat("text-embedding-004", { supportedGenerationMethods: ["embedContent"] }),
  chat("gemini-embedding-001", { supportedGenerationMethods: ["embedContent"] }),
];

describe("rankModels", () => {
  it("puts the newest Pro first, then the newest Flash, then the rest alphabetically", () => {
    const ids = rankModels(FIXTURE, "pro,flash").map((m) => m.id);
    expect(ids).toEqual([
      "gemini-3-pro-preview",
      "gemini-2.5-pro",
      "gemini-3-flash-preview",
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-2.5-flash-lite",
      "gemini-flash-latest",
    ]);
  });

  it("marks only the first model as default and maps limits", () => {
    const models = rankModels(FIXTURE, "pro,flash");
    expect(models.filter((m) => m.isDefault).map((m) => m.id)).toEqual(["gemini-3-pro-preview"]);
    expect(models[0]).toEqual({
      id: "gemini-3-pro-preview",
      displayName: "GEMINI-3-PRO-PREVIEW",
      inputTokenLimit: 1_000_000,
      outputTokenLimit: 65_536,
      isDefault: true,
    });
  });

  it("prefers a stable release over a preview of the same version", () => {
    const ids = rankModels([chat("gemini-2.5-pro-preview-06-05"), chat("gemini-2.5-pro")], "pro").map((m) => m.id);
    expect(ids).toEqual(["gemini-2.5-pro", "gemini-2.5-pro-preview-06-05"]);
  });

  it("follows the configured order and treats flash-lite as its own family", () => {
    const ids = rankModels(FIXTURE, "flash-lite,flash").map((m) => m.id);
    expect(ids.slice(0, 4)).toEqual(["gemini-2.5-flash-lite", "gemini-3-flash-preview", "gemini-2.5-flash", "gemini-2.0-flash"]);
  });

  it("compares versions numerically, not as strings", () => {
    const ids = rankModels([chat("gemini-2.5-flash"), chat("gemini-10-flash"), chat("gemini-2.10-flash")], "flash").map((m) => m.id);
    expect(ids).toEqual(["gemini-10-flash", "gemini-2.10-flash", "gemini-2.5-flash"]);
  });

  it("drops models without generateContent and non-chat variants", () => {
    const ids = rankModels(FIXTURE, "pro,flash").map((m) => m.id);
    expect(ids).not.toContain("gemini-embedding-001");
    expect(ids).not.toContain("gemini-2.5-flash-preview-tts");
    expect(ids).not.toContain("gemini-3-pro-image-preview");
    expect(ids).not.toContain("gemma-3-27b-it");
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("fetchGeminiModels", () => {
  it("follows page tokens and sends the key only in a header", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      return url.searchParams.get("pageToken") === "p2"
        ? jsonResponse({ models: [chat("gemini-2.5-pro")] })
        : jsonResponse({ models: [chat("gemini-2.5-flash")], nextPageToken: "p2" });
    });
    const models = await fetchGeminiModels("secret-key", fetchImpl);
    expect(models.map((m) => m.name)).toEqual(["models/gemini-2.5-flash", "models/gemini-2.5-pro"]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    for (const [input, init] of fetchImpl.mock.calls) {
      expect(String(input)).not.toContain("secret-key");
      expect(new Headers(init?.headers).get("x-goog-api-key")).toBe("secret-key");
    }
  });

  it("turns a rejected key into a calm error without echoing the response", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({ error: { message: "API key not valid: secret-key" } }, 400));
    const error = await fetchGeminiModels("secret-key", fetchImpl).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ModelProviderError);
    expect((error as Error).message).toBe(PROVIDER_UNAVAILABLE_MESSAGE);
    expect(JSON.stringify(error)).not.toContain("secret-key");
  });
});

describe("createModelRegistry", () => {
  it("caches for the TTL, shares in-flight requests and refetches after expiry", async () => {
    let now = 0;
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({ models: FIXTURE }));
    const registry = createModelRegistry({ apiKey: "k", preference: "pro,flash", fetchImpl, ttlMs: 1000, now: () => now });

    await Promise.all([registry.list(), registry.list()]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    now = 999;
    await registry.list();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    now = 1000;
    await registry.list();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("does not cache failures", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({}, 503))
      .mockResolvedValueOnce(jsonResponse({ models: FIXTURE }));
    const registry = createModelRegistry({ apiKey: "k", preference: "pro,flash", fetchImpl });
    await expect(registry.list()).rejects.toBeInstanceOf(ModelProviderError);
    await expect(registry.list()).resolves.toHaveLength(7);
  });

  it("resolves the default, a listed model, or null for an unknown one", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({ models: FIXTURE }));
    const registry = createModelRegistry({ apiKey: "k", preference: "pro,flash", fetchImpl });
    expect((await registry.resolve())?.id).toBe("gemini-3-pro-preview");
    expect((await registry.resolve("gemini-2.5-flash"))?.id).toBe("gemini-2.5-flash");
    expect(await registry.resolve("gemini-1.0-ultra")).toBeNull();
  });
});
