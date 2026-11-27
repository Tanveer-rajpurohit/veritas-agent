import { expect, test } from "@playwright/test";
import { expectNoSeriousA11yViolations, revealDock, signUpWithWorkspace, trackConsoleErrors } from "./helpers";

const APPS = [
  { label: "Docs", path: "docs" },
  { label: "Sheets", path: "sheets" },
  { label: "Slides", path: "slides" },
  { label: "PDF", path: "pdf" },
  { label: "Files", path: "files" },
  { label: "Agent", path: "agent" },
  { label: "Settings", path: "settings" },
];

test.describe("F012 shell with bottom dock", () => {
  test("dock opens every app, shows tooltips and marks the active app", async ({ page }) => {
    // Sign-up plus seven app navigations; each first visit compiles in Next dev.
    test.slow();
    const errors = trackConsoleErrors(page);
    const { workspaceId } = await signUpWithWorkspace(page);

    const dock = page.getByRole("navigation", { name: "Apps" });
    await revealDock(page);
    const box = (await dock.locator("ul").boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThan(2);
    expect(viewport.height - (box.y + box.height)).toBeLessThan(24);
    await expectNoSeriousA11yViolations(page);

    for (const app of APPS) {
      const link = dock.getByRole("link", { name: app.label, exact: true });
      await revealDock(page);
      await link.click();
      await expect(page).toHaveURL(new RegExp(`/w/${workspaceId}/${app.path}$`));
      await expect(page.getByRole("main").getByRole("heading", { level: 1, name: app.label })).toBeVisible();
      await expect(link).toHaveAttribute("aria-current", "page");
      await expect(dock.locator('[aria-current="page"]')).toHaveCount(1);
    }
    await expectNoSeriousA11yViolations(page);

    const docs = dock.getByRole("link", { name: "Docs", exact: true });
    const tooltip = docs.locator("[data-dock-tooltip]");
    await revealDock(page);
    await expect(tooltip).toBeHidden();
    await docs.hover();
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toHaveText("Docs");

    // The workspace name in the header returns to Home, which no dock app claims.
    await page.getByRole("link", { name: "Verma & Co" }).click();
    await expect(page).toHaveURL(new RegExp(`/w/${workspaceId}$`));
    await expect(dock.locator('[aria-current="page"]')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("dock hides over open windows, returns at the bottom edge and magnifies", async ({ page }) => {
    await signUpWithWorkspace(page);
    const tray = page.getByRole("navigation", { name: "Apps" }).locator("ul");
    const { width, height } = page.viewportSize()!;

    // The Home window is open, so the dock is tucked below the edge.
    await page.mouse.move(width / 2, height / 2);
    await expect(tray).not.toBeInViewport();

    await revealDock(page);
    const docsItem = tray.locator("[data-dock-item]").filter({ has: page.getByRole("link", { name: "Docs", exact: true }) });
    const restWidth = (await docsItem.boundingBox())!.width;
    await docsItem.hover();
    await expect.poll(async () => (await docsItem.boundingBox())!.width).toBeGreaterThan(restWidth + 12);

    // Leaving the dock hides it again after a short delay.
    await page.mouse.move(width / 2, height / 2);
    await expect(tray).not.toBeInViewport();
  });

  test("keyboard focus shows the tooltip and an unknown app is a 404", async ({ page }) => {
    const { workspaceId } = await signUpWithWorkspace(page);
    const sheets = page.getByRole("navigation", { name: "Apps" }).getByRole("link", { name: "Sheets", exact: true });
    await sheets.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(sheets).toBeFocused();
    await expect(sheets.locator("[data-dock-tooltip]")).toBeVisible();

    const res = await page.goto(`/w/${workspaceId}/nope`);
    expect(res?.status()).toBe(404);
  });
});
