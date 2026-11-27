import { z } from "zod";

/** Which sign-in methods this deployment offers. Email is always on. */
export const authProviders = z.object({ google: z.boolean() });

export type AuthProviders = z.infer<typeof authProviders>;
