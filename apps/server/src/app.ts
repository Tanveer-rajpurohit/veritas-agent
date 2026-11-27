import Fastify from "fastify";
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from "fastify-type-provider-zod";
import { createAuth } from "./auth/auth";
import { createMailer } from "./auth/mailer";
import { sessionReader } from "./auth/guard";
import { authRoutes } from "./auth/routes";
import type { ConnectorDeps } from "./connectors/context";
import { connectorRoutes } from "./connectors/routes";
import { createConnectorStore, redisKv } from "./connectors/store";
import { createVault } from "./connectors/vault";
import type { Deps } from "./deps";
import type { Env } from "./env";
import { mailRoutes } from "./mail/routes";
import { healthRoutes } from "./routes/health";
import { workspaceRoutes } from "./workspaces/routes";

export async function buildApp(env: Env, deps: Deps) {
  const app = Fastify({
    logger:
      env.NODE_ENV === "test"
        ? false
        : {
            level: env.LOG_LEVEL,
            redact: ["req.headers.cookie", "req.headers.authorization", 'res.headers["set-cookie"]'],
            serializers: {
              // Query strings carry OAuth codes and private mail searches; log the path only.
              req: (req) => ({ method: req.method, url: req.url.split("?")[0], host: req.host, remoteAddress: req.ip }),
            },
          },
    genReqId: () => crypto.randomUUID(),
    // Only the local Next proxy is trusted to report the client IP. Trusting every
    // hop would let a client forge X-Forwarded-For and dodge auth rate limits.
    trustProxy: "loopback",
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.addHook("onSend", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });

  app.setErrorHandler((error, request, reply) => {
    if (typeof error === "object" && error !== null && "validation" in error && Array.isArray(error.validation)) {
      const fields: Record<string, string> = {};
      for (const issue of error.validation as { instancePath?: string; message?: string }[]) {
        const key = (issue.instancePath ?? "").replace(/^\//, "") || "body";
        fields[key] ??= issue.message ?? "Invalid value";
      }
      return reply.status(400).send({ error: "Check the highlighted fields.", fields, requestId: request.id });
    }
    const statusCode = typeof error === "object" && error !== null && "statusCode" in error ? Number(error.statusCode) : 500;
    const status = statusCode >= 400 && statusCode < 500 ? statusCode : 500;
    const message = error instanceof Error ? error.message : "Request failed";
    if (status >= 500) request.log.error({ err: error }, "request failed");
    return reply.status(status).send({
      error: status >= 500 ? "Something went wrong on our side. Please try again." : message,
      requestId: request.id,
    });
  });

  const auth = createAuth(env, deps, createMailer(env));
  await app.register(healthRoutes(deps));
  await authRoutes(app, auth, env);
  await app.register(workspaceRoutes(deps, auth));
  const connectorDeps: ConnectorDeps = {
    store: createConnectorStore(deps.db),
    kv: redisKv(deps.redis),
    vault: createVault([{ version: 1, kek: env.CONNECTOR_KEK }]),
    fetch: globalThis.fetch,
    readSession: sessionReader(auth),
    webOrigin: env.WEB_ORIGIN,
    google:
      env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }
        : null,
    now: Date.now,
  };
  await app.register(connectorRoutes(connectorDeps));
  await app.register(mailRoutes(connectorDeps));
  app.decorate("auth", auth);
  return app;
}

declare module "fastify" {
  interface FastifyInstance {
    auth: ReturnType<typeof createAuth>;
  }
}
