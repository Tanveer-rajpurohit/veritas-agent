import { expect, test } from "@playwright/test";
import { isolatedIp, signUpAndVerify, TEST_PASSWORD, uniqueEmail } from "./helpers";

test.describe("F008 auth error states and rate limits", () => {
  test("wrong password gives a generic message, then the 11th try is rate limited", async ({ page }) => {
    await page.setExtraHTTPHeaders({ "x-forwarded-for": isolatedIp() });
    await page.goto("/sign-in");
    const form = page.locator("form");
    await page.getByLabel("Email").fill(uniqueEmail("ghost"));
    await page.getByLabel("Password", { exact: true }).fill("not-the-password-1");

    for (let attempt = 1; attempt <= 10; attempt++) {
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(form.getByRole("alert")).toHaveText("Email or password is incorrect.");
      await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
    }

    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(form.getByRole("alert")).toHaveText(/^Too many attempts\. Try again in \d+ seconds\.$/);
  });

  test("sign-up with an existing email does not reveal the account", async ({ page }) => {
    const { email } = await signUpAndVerify(page);
    await page.context().clearCookies();
    await page.goto("/sign-up");
    await page.getByLabel("Full name").fill("Someone Else");
    await page.getByLabel("Work email").fill(email);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
  });

  test("a short password shows the inline rule before anything is sent", async ({ page }) => {
    let authCalls = 0;
    page.on("request", (req) => {
      if (req.url().includes("/api/auth/sign-up")) authCalls++;
    });
    await page.goto("/sign-up");
    await page.getByLabel("Full name").fill("Asha Verma");
    await page.getByLabel("Work email").fill(uniqueEmail("short"));
    await page.getByLabel("Password").fill("short1");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Use at least 10 characters.")).toBeVisible();
    await expect(page.getByLabel("Password")).toHaveAttribute("aria-invalid", "true");
    expect(authCalls).toBe(0);
  });
});
