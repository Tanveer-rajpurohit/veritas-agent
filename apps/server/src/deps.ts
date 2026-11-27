import { createGeminiProvider, type ModelProvider } from "@veritas/agent-core";
import { createDb, type Db } from "@veritas/db";
import { Redis } from "ioredis";
import { Client as BlobClient } from "minio";
import type { Env } from "./env";

/** Minimum S3 part size; caps per-upload memory while 10,000 parts still allow 50 GB objects. */
const BLOB_PART_BYTES = 5 * 1024 * 1024;

export type Deps = {
  db: Db;
  sql: ReturnType<typeof createDb>["sql"];
  redis: Redis;
  blob: BlobClient;
  bucket: string;
  /** Model registry and language models; tests swap in a mock provider. */
  agent: ModelProvider;
  close: () => Promise<void>;
};

export function createDeps(env: Env): Deps {
  const { db, sql } = createDb(env.DATABASE_URL);
  const redis = new Redis(env.REDIS_URL, { lazyConnect: false, maxRetriesPerRequest: 2 });
  const endpoint = new URL(env.BLOB_ENDPOINT);
  const blob = new BlobClient({
    endPoint: endpoint.hostname,
    port: Number(endpoint.port || (endpoint.protocol === "https:" ? 443 : 80)),
    useSSL: endpoint.protocol === "https:",
    accessKey: env.BLOB_ACCESS_KEY,
    secretKey: env.BLOB_SECRET_KEY,
    pathStyle: true,
    // The client buffers one part per upload in memory; the 64 MB default is too much for streamed uploads.
    partSize: BLOB_PART_BYTES,
  });

  return {
    db,
    sql,
    redis,
    blob,
    bucket: env.BLOB_BUCKET,
    agent: createGeminiProvider({ apiKey: env.GEMINI_API_KEY, preference: env.MODEL_PREFERENCE }),
    close: async () => {
      redis.disconnect();
      await sql.end({ timeout: 5 });
    },
  };
}

export async function ensureBucket(deps: Deps): Promise<void> {
  if (!(await deps.blob.bucketExists(deps.bucket))) await deps.blob.makeBucket(deps.bucket);
}
