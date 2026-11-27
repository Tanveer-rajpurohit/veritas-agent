import { z } from "zod";

export const connectorProvider = z.enum(["google"]);
export type ConnectorProvider = z.infer<typeof connectorProvider>;

export const connectorStatus = z.enum(["active", "needs_reconnect"]);
export type ConnectorStatus = z.infer<typeof connectorStatus>;

/**
 * Features a user can turn on for the Google connector. Each maps to the
 * narrowest Gmail scope it needs; `gmail_send` is asked for only when the
 * user enables sending.
 */
export const googleFeature = z.enum(["gmail", "gmail_send"]);
export type GoogleFeature = z.infer<typeof googleFeature>;

export const connectorStartQuery = z.object({
  features: z
    .string()
    .default("gmail")
    .transform((v) => v.split(",").map((f) => f.trim()).filter(Boolean))
    .pipe(z.array(googleFeature).min(1, "Pick at least one feature")),
});

/** Connector as the API shows it. Tokens never leave the server. */
export const connectorSummary = z.object({
  provider: connectorProvider,
  accountEmail: z.string().nullable(),
  scopes: z.array(z.string()),
  connectedAt: z.iso.datetime(),
  status: connectorStatus,
});
export type ConnectorSummary = z.infer<typeof connectorSummary>;

export const connectorList = z.object({ connectors: z.array(connectorSummary) });
export type ConnectorList = z.infer<typeof connectorList>;

/**
 * 409 body when a route needs a Google connection the user does not have yet,
 * or a scope they have not granted. `connect` tells the UI to offer the
 * connect flow; `needsScope` names the missing scope.
 */
export const connectorRequired = z.object({
  error: z.string(),
  connect: z.literal(true),
  needsScope: z.string().optional(),
  requestId: z.string().optional(),
});
export type ConnectorRequired = z.infer<typeof connectorRequired>;
