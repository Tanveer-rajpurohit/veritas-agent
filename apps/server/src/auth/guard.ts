import type { FastifyReply, FastifyRequest } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import type { Auth } from "./auth";

export type SessionUser = { id: string; name: string; email: string; emailVerified: boolean };
/** Resolves the caller: their user, "unverified" when the email isn't confirmed, or null. */
export type SessionReader = (request: FastifyRequest) => Promise<SessionUser | "unverified" | null>;

declare module "fastify" {
  interface FastifyRequest {
    user: SessionUser | null;
  }
}

export function sessionReader(auth: Auth): SessionReader {
  return async (request) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!session) return null;
    if (!session.user.emailVerified) return "unverified";
    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      emailVerified: session.user.emailVerified,
    };
  };
}

/** preHandler: rejects requests without a verified session; sets request.user. */
export function requireSessionFrom(read: SessionReader) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await read(request);
    if (!user) return reply.code(401).send({ error: "Sign in to continue." });
    if (user === "unverified") return reply.code(403).send({ error: "Confirm your email to continue." });
    request.user = user;
  };
}

export function requireSession(auth: Auth) {
  return requireSessionFrom(sessionReader(auth));
}
