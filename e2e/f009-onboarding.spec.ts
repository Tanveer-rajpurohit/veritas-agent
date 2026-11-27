import { expect, test } from "@playwright/test";
import { expectNoSeriousA11yViolations, signUpAndVerify, trackConsoleErrors } from "./helpers";

test.describe("F009 onboarding creates the first workspace", () => {
  test("new user names a workspace and lands on its Home", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await signUpAndVerify(page);
    await expect(page.getByLabel("Workspace name")).toBeFocused();
    await expectNoSeriousA11yViolations(page);

    await page.getByRole("button", { name: "Create workspace" }).click();
    await expect(page.getByText("Name is required")).toBeVisible();

    await page.getByLabel("Workspace name").fill("  Verma & Co  ");
    await page.getByRole("button", { name: "Create workspace" }).click();
    await expect(page).toHaveURL(/\/w\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: "Verma & Co" })).toBeVisible();

    // The root now routes straight to the workspace instead of onboarding.
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Verma & Co" })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("the API rejects anonymous requests", async ({ request }) => {
    const anonymous = await request.post("/api/v1/workspaces", { data: { name: "Nope" } });
    expect(anonymous.status()).toBe(401);
  });

  test("the server validates a blank name", async ({ page }) => {
    await signUpAndVerify(page);
    const res = await page.request.post("/api/v1/workspaces", { data: { name: "   " } });
    expect(res.status()).toBe(400);
    expect((await res.json()).fields.name).toBe("Name is required");
  });
});
