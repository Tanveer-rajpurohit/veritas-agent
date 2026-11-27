import { schema } from "@veritas/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { Deps } from "../deps";
import type { Env } from "../env";
import { actionEmail, type Mailer } from "./mailer";

export const MIN_PASSWORD_LENGTH = 10;
const VERIFY_TOKEN_SECONDS = 60 * 60 * 24;
const RESET_TOKEN_SECONDS = 60 * 60;

// INCR and set the TTL only on creation, atomically, so a window never extends.
export const INCREMENT_WITH_TTL = `local v = redis.call("INCR", KEYS[1]) if v == 1 then redis.call("EXPIRE", KEYS[1], ARGV[1]) end return v`;

export function createAuth(env: Env, deps: Deps, mailer: Mailer) {
  const google =
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
      : {};

  return betterAuth({
    // Browsers reach auth through the web origin (Next proxies /api/*), so
    // links in emails and OAuth callbacks use that origin.
    baseURL: env.WEB_ORIGIN,
    basePath: "/api/auth",
    secret: env.AUTH_SECRET,
    trustedOrigins: [env.WEB_ORIGIN],
    database: drizzleAdapter(deps.db, { provider: "pg", usePlural: true, schema }),
    secondaryStorage: {
      get: (key) => deps.redis.get(`auth:${key}`),
      set: async (key, value, ttl) => {
        if (ttl) await deps.redis.set(`auth:${key}`, value, "EX", ttl);
        else await deps.redis.set(`auth:${key}`, value);
      },
      delete: async (key) => {
        await deps.redis.del(`auth:${key}`);
      },
      getAndDelete: (key) => deps.redis.getdel(`auth:${key}`),
      increment: async (key, ttl) => Number(await deps.redis.eval(INCREMENT_WITH_TTL, 1, `auth:${key}`, ttl)),
    },
    // Sessions stay in Postgres so they survive a Redis flush.
    session: { storeSessionInDatabase: true },
    rateLimit: {
      enabled: true,
      storage: "secondary-storage",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 10 },
        "/sign-up/email": { window: 60, max: 10 },
        "/request-password-reset": { window: 60, max: 5 },
        "/send-verification-email": { window: 60, max: 5 },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: MIN_PASSWORD_LENGTH,
      maxPasswordLength: 128,
      resetPasswordTokenExpiresIn: RESET_TOKEN_SECONDS,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        const { html, text } = actionEmail({
          greetingName: user.name,
          intro: "We got a request to reset the password for your Veritas account.",
          action: "Choose a new password",
          url,
          outro: "This link works for 1 hour. If you didn't ask for this, you can ignore this email and your password stays the same.",
        });
        await mailer.send({ to: user.email, subject: "Reset your Veritas password", html, text });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: VERIFY_TOKEN_SECONDS,
      sendVerificationEmail: async ({ user, url }) => {
        const { html, text } = actionEmail({
          greetingName: user.name,
          intro: "Confirm your email address to finish setting up your Veritas account.",
          action: "Confirm my email",
          url,
          outro: "This link works for 24 hours. If you didn't create an account, you can ignore this email.",
        });
        await mailer.send({ to: user.email, subject: "Confirm your email for Veritas", html, text });
      },
    },
    account: { accountLinking: { enabled: true, trustedProviders: ["google"] } },
    socialProviders: google,
    advanced: {
      useSecureCookies: env.NODE_ENV === "production",
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
