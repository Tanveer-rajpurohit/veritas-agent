import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import { createModelRegistry, type ModelRegistry } from "./models";

export type ModelProvider = {
  registry: ModelRegistry;
  languageModel: (modelId: string) => LanguageModel;
};

/** Gemini behind the provider shape the server uses, so other providers can slot in later. */
export function createGeminiProvider(options: { apiKey: string; preference: string }): ModelProvider {
  const google = createGoogleGenerativeAI({ apiKey: options.apiKey });
  return {
    registry: createModelRegistry({ apiKey: options.apiKey, preference: options.preference }),
    languageModel: (modelId) => google(modelId),
  };
}
