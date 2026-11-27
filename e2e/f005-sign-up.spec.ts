import { expect, test } from "@playwright/test";
import { countEmails, expectNoSeriousA11yViolations, trackConsoleErrors, uniqueEmail, waitForEmailLink } from "./helpers";

const PASSWORD = "correct-horse-battery-9";

test.describe("F005 email sign-up with verification", () => {
  test("sign up, confirm via email, land on onboarding with a secure session", async ({ page, context }) => {
    const errors = trackConsoleErrors(page);
    const email = uniqueEmail("signup");

    await page.goto("/sign-up");
    await expectNoSeriousA11yViolations(page);
    await page.getByLabel("Full name").fill("Asha Verma");
    await page.getByLabel("Work email").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();

    const link = await waitForEmailLink(email, "/api/auth/verify-email");
    await page.goto(link);

    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.getByRole("heading", { name: "Welcome to Veritas, Asha" })).toBeVisible();

    const session = (await context.cookies()).find((c) => c.name.includes("session_token"));
    expect(session, "session cookie").toBeDefined();
    expect(session?.httpOnly).toBe(true);
    expect(session?.sameSite).toBe("Lax");
    expect(errors).toEqual([]);
  });

  test("signing in before verifying shows 'Verify your email' with a working resend", async ({ page }) => {
    const email = uniqueEmail("unverified");
    await page.goto("/sign-up");
    await page.getByLabel("Full name").fill("Ravi Iyer");
    await page.getByLabel("Work email").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
    await expect.poll(() => countEmails(email)).toBe(1);

    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("heading", { name: "Verify your email" })).toBeVisible();
    await page.getByRole("button", { name: "Resend the email" }).click();
    await expect(page.getByText("Sent. It can take a minute to arrive.")).toBeVisible();
    await expect.poll(() => countEmails(email)).toBe(2);
  });

  test("shows inline validation before sending anything", async ({ page }) => {
    await page.goto("/sign-up");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Enter your name.")).toBeVisible();
    await expect(page.getByText("Enter a valid email address, like name@company.com.")).toBeVisible();
    await expect(page.getByText("Use at least 10 characters.")).toBeVisible();
  });
});
