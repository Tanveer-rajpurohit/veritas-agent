import { expect, test } from "@playwright/test";
import { expectNoSeriousA11yViolations } from "./helpers";

// The consent screen itself needs a real Google account, so it is checked by hand
// (see PROGRESS.md). These tests cover everything up to handing off to Google.
test.describe("F007 Google sign-in", () => {
  test.beforeEach(async ({ request }) => {
    const { google } = await (await request.get("/api/v1/auth/providers")).json();
    test.skip(!google, "GOOGLE_CLIENT_ID/SECRET are not configured");
  });

  for (const path of ["/sign-in", "/sign-up"]) {
    test(`${path} hands off to Google with the right callback`, async ({ page }) => {
      let authorizeUrl: URL | null = null;
      await page.route("https://accounts.google.com/**", async (route) => {
        authorizeUrl = new URL(route.request().url());
        await route.fulfill({ status: 200, contentType: "text/html", body: "<title>Google stub</title>" });
      });
      await page.goto(path);
      await expectNoSeriousA11yViolations(page);
      await page.getByRole("button", { name: "Continue with Google" }).click();
      await expect(page).toHaveTitle("Google stub");

      const url = authorizeUrl as URL | null;
      expect(url?.pathname).toBe("/o/oauth2/v2/auth");
      expect(url?.searchParams.get("redirect_uri")).toBe("http://localhost:3000/api/auth/callback/google");
      expect(url?.searchParams.get("scope")?.split(" ").sort()).toEqual(["email", "openid", "profile"]);
      expect(url?.searchParams.get("state")).toBeTruthy();
      expect(url?.searchParams.get("code_challenge_method")).toBe("S256");
    });
  }

  test("a failed Google round trip explains what to do", async ({ page }) => {
    await page.goto("/sign-in?error=google");
    await expect(page.locator("main, body").getByText("Google sign-in didn't finish. Try again, or sign in with your email.")).toBeVisible();
  });

  test("a forged callback without valid state is rejected", async ({ page }) => {
    const res = await page.request.get("/api/auth/callback/google?code=fake&state=forged", { maxRedirects: 0 });
    expect([302, 400, 401, 403]).toContain(res.status());
    if (res.status() === 302) expect(res.headers()["location"]).toContain("error");
    const session = await (await page.request.get("/api/auth/get-session")).json();
    expect(session).toBeNull();
  });
});
