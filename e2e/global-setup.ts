/**
 * Next dev compiles each route on first request. On a cold cache that can take
 * longer than a test's timeout, so compile every route once before tests run.
 */
const WEB_URL = process.env.E2E_WEB_URL ?? "http://localhost:3000";
const ROUTES = ["/", "/sign-in", "/sign-up", "/onboarding", "/forgot-password", "/reset-password", "/_design", "/w/00000000-0000-7000-8000-000000000000", "/w/00000000-0000-7000-8000-000000000000/docs"];
const WARM_TIMEOUT_MS = 120_000;

export default async function globalSetup() {
  for (const route of ROUTES) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), WARM_TIMEOUT_MS);
    try {
      await fetch(`${WEB_URL}${route}`, { redirect: "manual", signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }
}
