import { expect, test, type Page } from "@playwright/test";
import { expectNoSeriousA11yViolations, signUpWithWorkspace, TEST_PASSWORD, trackConsoleErrors, waitForEmailLink } from "./helpers";

const NEW_PASSWORD = "new-staple-lantern-42";
// Chrome logs a deliberate wrong-password 401 as a resource error.
const EXPECTED_401 = "Failed to load resource: the server responded with a status of 401 (Unauthorized)";

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test.describe("F006 sign-in, sign-out and password reset", () => {
  test("sign out from the account menu, then sign back in to Home", async ({ page }) => {
    test.slow();
    const errors = trackConsoleErrors(page);
    const { email, workspaceId } = await signUpWithWorkspace(page);

    await page.getByRole("button", { name: "Account" }).click();
    await expect(page.getByText(email)).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);

    await page.goto(`/w/${workspaceId}/docs`);
    await expect(page).toHaveURL(/\/sign-in$/);

    await signIn(page, email, TEST_PASSWORD);
    await expect(page).toHaveURL(new RegExp(`/w/${workspaceId}$`));
    await expect(page.getByRole("heading", { level: 1, name: "Verma & Co" })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("forgot password resets via the email link and the old password stops working", async ({ page }) => {
    test.slow();
    const errors = trackConsoleErrors(page);
    const { email, workspaceId } = await signUpWithWorkspace(page);
    await page.context().clearCookies();

    await page.goto("/sign-in");
    await page.getByRole("link", { name: "Forgot password?" }).click();
    await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
    await expectNoSeriousA11yViolations(page);
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();

    const link = await waitForEmailLink(email, "/api/auth/reset-password/");
    await page.goto(link);
    await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();
    await expectNoSeriousA11yViolations(page);

    await page.getByLabel("New password", { exact: true }).fill(NEW_PASSWORD);
    await page.getByLabel("Confirm new password").fill("something-else-123");
    await page.getByRole("button", { name: "Save new password" }).click();
    await expect(page.getByText("The passwords don't match.")).toBeVisible();

    await page.getByLabel("Confirm new password").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Save new password" }).click();
    await expect(page.getByRole("heading", { name: "Password updated" })).toBeVisible();

    // The link works once.
    await page.goto(link);
    await expect(page.getByRole("heading", { name: "This link has expired" })).toBeVisible();

    await signIn(page, email, TEST_PASSWORD);
    await expect(page.locator("form").getByRole("alert")).toHaveText("Email or password is incorrect.");

    await signIn(page, email, NEW_PASSWORD);
    await expect(page).toHaveURL(new RegExp(`/w/${workspaceId}$`));
    expect(errors.filter((e) => e !== EXPECTED_401)).toEqual([]);
    expect(errors.filter((e) => e === EXPECTED_401)).toHaveLength(1);
  });

  test("an unknown email gets the same confirmation", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill("nobody-here@example.test");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
  });
});
