import { expect, test } from "@playwright/test";
import { expectNoSeriousA11yViolations, setTheme, trackConsoleErrors } from "./helpers";

test.describe("F011 design tokens, themes and orb", () => {
  test("foundations page renders tokens and type scale", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/_design");
    await expect(page.getByRole("heading", { name: "Design foundations" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Type scale (Space Grotesk)" })).toBeVisible();
    await expect(page.getByText("surface-selected")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("both themes pass contrast and have no serious axe violations", async ({ page }) => {
    await page.goto("/_design");
    for (const theme of ["light", "dark"] as const) {
      await setTheme(page, theme);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expectNoSeriousA11yViolations(page);
    }
  });

  test("theme switch applies and persists across reload", async ({ page }) => {
    await page.goto("/_design");
    await page.getByRole("radio", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.getByRole("radio", { name: "Dark" })).toHaveAttribute("aria-checked", "true");
    await page.getByRole("radio", { name: "Light" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("orb renders at 16, 32 and 128 px and animates only when thinking", async ({ page }) => {
    await page.goto("/_design");
    for (const size of [16, 32, 128]) {
      const svg = page.getByTestId(`orb-${size}`).locator("svg");
      await expect(svg).toHaveAttribute("width", String(size));
      await expect(svg).toHaveAttribute("data-state", "idle");
    }
    await expect(page.locator(".vt-orb-sweep")).toHaveCount(0);
    await page.getByRole("button", { name: "Show thinking state" }).click();
    await expect(page.locator(".vt-orb-sweep")).toHaveCount(3);
    const animation = await page.locator(".vt-orb-sweep").first().evaluate((el) => getComputedStyle(el).animationName);
    expect(animation).toBe("vt-orb-sweep");
  });

  test("reduced motion stops the thinking sweep", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/_design");
    await page.getByRole("button", { name: "Show thinking state" }).click();
    const animation = await page.locator(".vt-orb-sweep").first().evaluate((el) => getComputedStyle(el).animationName);
    expect(animation).toBe("none");
  });
});
