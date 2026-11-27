import type { FastifyInstance, FastifyRequest } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import { authProviders, type AuthProviders } from "@veritas/shared";
import type { Env } from "../env";
import type { Auth } from "./auth";

function toFetchRequest(request: FastifyRequest): Request {
  const url = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);
  const hasBody = request.method !== "GET" && request.method !== "HEAD" && request.body !== undefined;
  const headers = fromNodeHeaders(request.headers);
  // Better Auth keys rate limits on X-Forwarded-For; give it the address Fastify
  // resolved through trusted proxies only, never the raw client-supplied header.
  headers.set("x-forwarded-for", request.ip);
  return new Request(url, {
    method: request.method,
    headers,
    body: hasBody ? JSON.stringify(request.body) : undefined,
  });
}

/** Mounts Better Auth's fetch handler under /api/auth/*. */
export async function authRoutes(app: FastifyInstance, auth: Auth, env: Env) {
  // Public: the sign-in page only offers providers that are actually configured.
  app.get("/api/v1/auth/providers", async (): Promise<AuthProviders> =>
    authProviders.parse({ google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) }),
  );

  app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    handler: async (request, reply) => {
      const response = await auth.handler(toFetchRequest(request));
      reply.status(response.status);
      // Set-Cookie must stay separate headers; Headers.forEach would join them.
      const cookies = response.headers.getSetCookie();
      if (cookies.length > 0) reply.header("set-cookie", cookies);
      response.headers.forEach((value, key) => {
        if (key !== "set-cookie") reply.header(key, value);
      });
      return reply.send(response.body ? await response.text() : null);
    },
  });
}
