import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export async function setTheme(page: Page, theme: "light" | "dark") {
  await page.evaluate((t) => {
    document.documentElement.dataset.theme = t;
  }, theme);
}

/** Fails on any serious or critical axe violation, listing rule and target. */
export async function expectNoSeriousA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const summary = serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
  expect(summary, "serious or critical axe violations").toEqual([]);
}

/** The dock hides while windows are open; moving to the bottom edge brings it up, as a user would. */
export async function revealDock(page: Page) {
  const { width, height } = page.viewportSize()!;
  await page.mouse.move(width / 2, height - 2);
  await expect(page.getByRole("navigation", { name: "Apps" }).locator("ul")).toBeInViewport({ ratio: 1 });
}

/** Collects console errors for the whole test so pages can assert none occurred. */
export function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

const MAILPIT = process.env.E2E_MAILPIT_URL ?? "http://localhost:8025";

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.test`;
}

type MailpitSummary = { ID: string; Subject: string };

/** Polls Mailpit for the newest email to `to` and returns its first link containing `pathPart`. */
export async function waitForEmailLink(to: string, pathPart: string, timeoutMs = 15_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const search = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    const { messages } = (await search.json()) as { messages: MailpitSummary[] };
    const newest = messages[0];
    if (newest) {
      const message = (await (await fetch(`${MAILPIT}/api/v1/message/${newest.ID}`)).json()) as { Text: string };
      const link = message.Text.match(/https?:\/\/\S+/g)?.find((url) => url.includes(pathPart));
      if (link) return link;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No email with a ${pathPart} link arrived for ${to}`);
}

export async function countEmails(to: string): Promise<number> {
  const search = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
  return ((await search.json()) as { messages_count: number }).messages_count;
}

/**
 * Each simulated user gets its own client IP (RFC 5737 documentation range) so
 * auth rate limits apply per user, as in real use, instead of to the whole suite.
 */
export const isolatedIp = () => `203.0.113.${1 + Math.floor(Math.random() * 250)}`;

export const TEST_PASSWORD = "correct-horse-battery-9";

/** Creates a verified account through the real UI and email flow; leaves the page on /onboarding. */
export async function signUpAndVerify(page: Page, name = "Asha Verma"): Promise<{ email: string }> {
  const email = uniqueEmail("user");
  await page.setExtraHTTPHeaders({ "x-forwarded-for": isolatedIp() });
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
  await page.goto(await waitForEmailLink(email, "/api/auth/verify-email"));
  await expect(page).toHaveURL(/\/onboarding$/);
  return { email };
}

/** Signs up, verifies and creates a workspace; leaves the page on the workspace Home. */
export async function signUpWithWorkspace(page: Page, workspaceName = "Verma & Co"): Promise<{ email: string; workspaceId: string }> {
  const { email } = await signUpAndVerify(page);
  await page.getByLabel("Workspace name").fill(workspaceName);
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page).toHaveURL(/\/w\/[0-9a-f-]{36}$/);
  const workspaceId = page.url().split("/w/")[1]!;
  return { email, workspaceId };
}
