import type { FastifyInstance, FastifyRequest } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import type { Auth } from "./auth";

function toFetchRequest(request: FastifyRequest): Request {
  const url = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);
  const hasBody = request.method !== "GET" && request.method !== "HEAD" && request.body !== undefined;
  return new Request(url, {
    method: request.method,
    headers: fromNodeHeaders(request.headers),
    body: hasBody ? JSON.stringify(request.body) : undefined,
  });
}

/** Mounts Better Auth's fetch handler under /api/auth/*. */
export async function authRoutes(app: FastifyInstance, auth: Auth) {
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
