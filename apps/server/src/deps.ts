import { createDb, type Db } from "@veritas/db";
import { Redis } from "ioredis";
import { Client as BlobClient } from "minio";
import type { Env } from "./env";

export type Deps = {
  db: Db;
  sql: ReturnType<typeof createDb>["sql"];
  redis: Redis;
  blob: BlobClient;
  bucket: string;
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
  });

  return {
    db,
    sql,
    redis,
    blob,
    bucket: env.BLOB_BUCKET,
    close: async () => {
      redis.disconnect();
      await sql.end({ timeout: 5 });
    },
  };
}

export async function ensureBucket(deps: Deps): Promise<void> {
  if (!(await deps.blob.bucketExists(deps.bucket))) await deps.blob.makeBucket(deps.bucket);
}
