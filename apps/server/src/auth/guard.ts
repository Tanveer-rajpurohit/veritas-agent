import type { FastifyReply, FastifyRequest } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import type { Auth } from "./auth";

export type SessionUser = { id: string; name: string; email: string; emailVerified: boolean };

declare module "fastify" {
  interface FastifyRequest {
    user: SessionUser | null;
  }
}

/** preHandler: rejects requests without a verified session; sets request.user. */
export function requireSession(auth: Auth) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!session) return reply.code(401).send({ error: "Sign in to continue." });
    if (!session.user.emailVerified) return reply.code(403).send({ error: "Confirm your email to continue." });
    request.user = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      emailVerified: session.user.emailVerified,
    };
  };
}
