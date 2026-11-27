import { z } from "zod";

const required = z.string().trim().min(1, "is required");
const optional = z.string().trim().optional().transform((v) => (v ? v : undefined));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.url(),

  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),

  BLOB_ENDPOINT: z.url(),
  BLOB_BUCKET: required,
  BLOB_ACCESS_KEY: required,
  BLOB_SECRET_KEY: required,

  AUTH_SECRET: z.string().min(32, "must be at least 32 characters"),
  GOOGLE_CLIENT_ID: optional,
  GOOGLE_CLIENT_SECRET: optional,

  SMTP_HOST: required,
  SMTP_PORT: z.coerce.number().int().positive(),
  MAIL_FROM: required,

  GEMINI_API_KEY: required,
  MODEL_PREFERENCE: z.string().default("pro,flash"),

  CONNECTOR_KEK: z.string().min(32, "must be at least 32 characters"),
  MICROSOFT_CLIENT_ID: optional,
  MICROSOFT_CLIENT_SECRET: optional,
});

export type Env = z.infer<typeof envSchema>;

export class EnvError extends Error {
  constructor(readonly problems: string[]) {
    super(`Invalid environment:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
    this.name = "EnvError";
  }
}

/**
 * Validates configuration at boot. Problems name the variable and the rule
 * only; values are never echoed because most of them are secrets.
 */
export function loadEnv(source: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(source);
  if (result.success) return result.data;

  const problems = result.error.issues.map((issue) => {
    const name = issue.path.join(".");
    const isMissing = source[name] === undefined || source[name] === "";
    if (isMissing) return `${name} is missing`;
    return issue.code === "custom" || issue.code === "too_small" ? `${name} ${issue.message}` : `${name} is invalid (${issue.code})`;
  });
  throw new EnvError(problems);
}
