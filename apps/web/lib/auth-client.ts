"use client";

import { createAuthClient } from "better-auth/react";

// Same-origin: Next proxies /api/* to the server, so cookies stay first-party.
export const authClient = createAuthClient({ basePath: "/api/auth" });
