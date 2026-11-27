import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { healthResponse, type HealthResponse } from "@veritas/shared";
import type { Deps } from "../deps";

const CHECK_TIMEOUT_MS = 2000;

async function probe(check: () => Promise<unknown>): Promise<"ok" | "down"> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), CHECK_TIMEOUT_MS);
  });
  try {
    await Promise.race([check(), timeout]);
    return "ok";
  } catch {
    return "down";
  } finally {
    clearTimeout(timer);
  }
}

export function healthRoutes(deps: Deps): FastifyPluginAsyncZod {
  return async (app) => {
    app.get("/health", { schema: { response: { 200: healthResponse, 503: healthResponse } } }, async (_req, reply) => {
      const [db, redis, blob] = await Promise.all([
        probe(() => deps.sql`select 1`),
        probe(() => deps.redis.ping()),
        probe(() => deps.blob.bucketExists(deps.bucket)),
      ]);
      const allOk = db === "ok" && redis === "ok" && blob === "ok";
      const body: HealthResponse = { status: allOk ? "ok" : "degraded", db, redis, blob };
      return reply.code(allOk ? 200 : 503).send(body);
    });
  };
}
