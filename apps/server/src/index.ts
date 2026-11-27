import { buildApp } from "./app";
import { createDeps, ensureBucket } from "./deps";
import { EnvError, loadEnv, type Env } from "./env";

let env: Env;
try {
  env = loadEnv(process.env);
} catch (err) {
  if (err instanceof EnvError) {
    console.error(err.message);
    process.exit(1);
  }
  throw err;
}

const deps = createDeps(env);
await ensureBucket(deps);
const app = await buildApp(env, deps);

const shutdown = async (signal: string) => {
  app.log.info({ signal }, "shutting down");
  await app.close();
  await deps.close();
  process.exit(0);
};
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

await app.listen({ port: env.API_PORT, host: "127.0.0.1" });
