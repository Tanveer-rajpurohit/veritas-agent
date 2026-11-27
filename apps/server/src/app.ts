import Fastify from "fastify";
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from "fastify-type-provider-zod";
import { createAuth } from "./auth/auth";
import { createMailer } from "./auth/mailer";
import { authRoutes } from "./auth/routes";
import type { Deps } from "./deps";
import type { Env } from "./env";
import { healthRoutes } from "./routes/health";

export async function buildApp(env: Env, deps: Deps) {
  const app = Fastify({
    logger:
      env.NODE_ENV === "test"
        ? false
        : { level: env.LOG_LEVEL, redact: ["req.headers.cookie", "req.headers.authorization", 'res.headers["set-cookie"]'] },
    genReqId: () => crypto.randomUUID(),
    // Behind the Next proxy locally; trust it for client IPs used by rate limiting.
    trustProxy: true,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.addHook("onSend", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });

  app.setErrorHandler((error, request, reply) => {
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
  await authRoutes(app, auth);
  app.decorate("auth", auth);
  return app;
}

declare module "fastify" {
  interface FastifyInstance {
    auth: ReturnType<typeof createAuth>;
  }
}
