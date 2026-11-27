import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { healthResponse } from "@veritas/shared";

export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/health", { schema: { response: { 200: healthResponse } } }, async () => ({
    status: "ok" as const,
    db: "ok" as const,
    redis: "ok" as const,
    blob: "ok" as const,
  }));
};
