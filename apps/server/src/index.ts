import { loadEnv } from "./env";
import { buildApp } from "./app";

const env = loadEnv(process.env);
const app = await buildApp(env);

const shutdown = async (signal: string) => {
  app.log.info({ signal }, "shutting down");
  await app.close();
  process.exit(0);
};
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

await app.listen({ port: env.API_PORT, host: "127.0.0.1" });
