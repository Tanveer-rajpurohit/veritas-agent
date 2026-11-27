import type { ModelInfo } from "@veritas/shared";
import { z } from "zod";

const MODELS_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const PAGE_SIZE = 1000;
/** Guards against a provider that keeps returning page tokens. */
const MAX_PAGES = 10;
export const MODEL_CACHE_TTL_MS = 10 * 60 * 1000;

export const PROVIDER_UNAVAILABLE_MESSAGE = "Model provider unavailable, check GEMINI_API_KEY";

export class ModelProviderError extends Error {
  constructor(readonly status: number | undefined) {
    // Never carry the response body: Google echoes request details there.
    super(PROVIDER_UNAVAILABLE_MESSAGE);
    this.name = "ModelProviderError";
  }
}

const geminiModel = z.object({
  name: z.string(),
  displayName: z.string().optional(),
  inputTokenLimit: z.number().int().optional(),
  outputTokenLimit: z.number().int().optional(),
  supportedGenerationMethods: z.array(z.string()).optional(),
});
const geminiModelPage = z.object({ models: z.array(geminiModel).optional(), nextPageToken: z.string().optional() });
export type GeminiModel = z.infer<typeof geminiModel>;

/** Fetches every model the key can see, following page tokens. The key travels in a header, never the URL. */
export async function fetchGeminiModels(apiKey: string, fetchImpl: typeof fetch = fetch): Promise<GeminiModel[]> {
  const models: GeminiModel[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(MODELS_URL);
    url.searchParams.set("pageSize", String(PAGE_SIZE));
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    let response: Response;
    try {
      response = await fetchImpl(url, { headers: { "x-goog-api-key": apiKey } });
    } catch {
      throw new ModelProviderError(undefined);
    }
    if (!response.ok) throw new ModelProviderError(response.status);
    const parsed = geminiModelPage.safeParse(await response.json());
    if (!parsed.success) throw new ModelProviderError(response.status);
    models.push(...(parsed.data.models ?? []));
    pageToken = parsed.data.nextPageToken;
    if (!pageToken) break;
  }
  return models;
}

type Ranked = { family: number; version: number[]; isPreview: boolean; id: string };

// Variants whose output is not chat text (speech, images, live audio, transcripts, robotics); they can't drive the agent loop.
const NON_CHAT_VARIANT = /(^|-)(tts|image|audio|live|embedding|computer-use|transcribe|robotics|nano-banana)(-|$)/;

function compareVersionsDesc(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (b[i] ?? 0) - (a[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Matches `gemini-<version>-<family>[-suffix]` for one preference token. The
 * suffix may only mark a release channel (preview, exp, dates, build numbers),
 * so `flash` does not match `flash-lite` unless `flash-lite` is its own token.
 */
function rankFor(id: string, preference: string[]): Ranked | null {
  for (const [family, token] of preference.entries()) {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = new RegExp(`^gemini-(\\d+(?:\\.\\d+)*)-${escaped}(?:-([a-z0-9-]+))?$`).exec(id);
    if (!match) continue;
    const suffix = match[2] ?? "";
    const channelOnly = suffix.split("-").every((s) => s === "" || s === "preview" || s === "exp" || /^\d+$/.test(s));
    if (!channelOnly) continue;
    return { family, version: match[1]!.split(".").map(Number), isPreview: /preview|exp/.test(suffix), id };
  }
  return null;
}

/**
 * Orders chat-capable models: preferred families first in preference order,
 * newest version first, stable before preview. Remaining chat models follow
 * alphabetically. The first entry is the default.
 */
export function rankModels(models: GeminiModel[], preferenceList: string): ModelInfo[] {
  const preference = preferenceList
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const usable = models
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => ({ ...m, id: m.name.replace(/^models\//, "") }))
    .filter((m) => m.id.startsWith("gemini-") && !NON_CHAT_VARIANT.test(m.id));

  const ranked: (Ranked & { model: (typeof usable)[number] })[] = [];
  const rest: (typeof usable)[number][] = [];
  for (const model of usable) {
    const rank = rankFor(model.id, preference);
    if (rank) ranked.push({ ...rank, model });
    else rest.push(model);
  }

  ranked.sort(
    (a, b) =>
      a.family - b.family ||
      compareVersionsDesc(a.version, b.version) ||
      Number(a.isPreview) - Number(b.isPreview) ||
      a.id.length - b.id.length ||
      a.id.localeCompare(b.id),
  );
  rest.sort((a, b) => a.id.localeCompare(b.id));

  return [...ranked.map((r) => r.model), ...rest].map((m, index) => ({
    id: m.id,
    displayName: m.displayName ?? m.id,
    inputTokenLimit: m.inputTokenLimit ?? 0,
    outputTokenLimit: m.outputTokenLimit ?? 0,
    isDefault: index === 0,
  }));
}

export type ModelRegistry = {
  list: () => Promise<ModelInfo[]>;
  /** Returns the requested model if the key can use it, the default when no ID is given, or null. */
  resolve: (modelId?: string) => Promise<ModelInfo | null>;
};

export function createModelRegistry(options: {
  apiKey: string;
  preference: string;
  fetchImpl?: typeof fetch;
  ttlMs?: number;
  now?: () => number;
}): ModelRegistry {
  const ttl = options.ttlMs ?? MODEL_CACHE_TTL_MS;
  const now = options.now ?? Date.now;
  let cached: { at: number; models: ModelInfo[] } | null = null;
  let inFlight: Promise<ModelInfo[]> | null = null;

  const list = async () => {
    if (cached && now() - cached.at < ttl) return cached.models;
    // Concurrent callers share one request; failures are not cached.
    inFlight ??= fetchGeminiModels(options.apiKey, options.fetchImpl)
      .then((raw) => {
        const models = rankModels(raw, options.preference);
        cached = { at: now(), models };
        return models;
      })
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  };

  return {
    list,
    resolve: async (modelId) => {
      const models = await list();
      if (modelId === undefined) return models[0] ?? null;
      return models.find((m) => m.id === modelId) ?? null;
    },
  };
}
