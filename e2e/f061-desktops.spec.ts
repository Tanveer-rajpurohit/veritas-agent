import { expect, test, type Page } from "@playwright/test";
import { expectNoSeriousA11yViolations, signUpWithWorkspace, trackConsoleErrors } from "./helpers";

const savedLayout = (page: Page) =>
  page.waitForResponse((res) => res.request().method() === "PATCH" && res.url().includes("/desktops/") && res.ok());

test.describe("F061 desktops sidebar", () => {
  test("creates, switches and remembers desktops, and collapses the sidebar", async ({ page }) => {
    test.slow();
    const errors = trackConsoleErrors(page);
    await signUpWithWorkspace(page);

    const sidebar = page.getByRole("complementary", { name: "Desktops" });
    const desktops = sidebar.getByRole("navigation", { name: "Your desktops" });
    const home = desktops.getByRole("button", { name: "Home", exact: true });
    await expect(home).toHaveAttribute("aria-current", "true");
    await expect(page.getByRole("region", { name: "Home window" })).toBeVisible();
    await expectNoSeriousA11yViolations(page);

    // An empty name is refused with a message, and Escape backs out.
    await desktops.getByRole("button", { name: "New desktop" }).click();
    const nameInput = desktops.getByRole("textbox", { name: "Desktop name" });
    await nameInput.press("Enter");
    await expect(desktops.getByText("Name is required")).toBeVisible();
    await nameInput.press("Escape");
    await expect(nameInput).toHaveCount(0);

    await desktops.getByRole("button", { name: "New desktop" }).click();
    await nameInput.fill("Data room");
    await nameInput.press("Enter");
    const dataRoom = desktops.getByRole("button", { name: "Data room" });
    await expect(dataRoom).toHaveAttribute("aria-current", "true");
    await expect(home).not.toHaveAttribute("aria-current", "true");
    await expect(page.getByText("This desktop is empty")).toBeVisible();

    const saved = savedLayout(page);
    await page.getByRole("navigation", { name: "Apps" }).getByRole("link", { name: "Docs", exact: true }).click();
    const docsWindow = page.getByRole("region", { name: "Docs window" });
    await expect(docsWindow).toBeVisible();
    await saved;

    await home.click();
    await expect(page.getByRole("region", { name: "Home window" })).toBeVisible();
    await expect(docsWindow).toHaveCount(0);
    await dataRoom.click();
    await expect(docsWindow).toBeVisible();
    await expect(page).toHaveURL(/\/docs$/);

    await page.reload();
    await expect(dataRoom).toHaveAttribute("aria-current", "true");
    await expect(docsWindow).toBeVisible();

    const before = (await docsWindow.boundingBox())!.width;
    await sidebar.getByRole("button", { name: "Collapse sidebar" }).click();
    await expect(sidebar).toHaveCount(0);
    await expect.poll(async () => (await docsWindow.boundingBox())!.width).toBeGreaterThan(before + 150);
    await page.getByRole("button", { name: "Expand sidebar" }).click();
    await expect(page.getByRole("complementary", { name: "Desktops" })).toBeVisible();
    expect(errors).toEqual([]);
  });
});
