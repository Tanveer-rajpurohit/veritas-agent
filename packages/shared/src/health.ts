import { z } from "zod";

export const dependencyStatus = z.enum(["ok", "down"]);

export const healthResponse = z.object({
  status: z.enum(["ok", "degraded"]),
  db: dependencyStatus,
  redis: dependencyStatus,
  blob: dependencyStatus,
});

export type HealthResponse = z.infer<typeof healthResponse>;
