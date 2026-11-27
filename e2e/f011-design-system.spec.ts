import { expect, test, type Locator } from "@playwright/test";
import { expectNoSeriousA11yViolations, setTheme, trackConsoleErrors } from "./helpers";

async function blobAnimation(orb: Locator) {
  return orb.locator(".vt-orb-blob").first().evaluate((el) => {
    const s = getComputedStyle(el);
    return { name: s.animationName, seconds: parseFloat(s.animationDuration) };
  });
}

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

  test("light canvas is white and dark canvas is black", async ({ page }) => {
    await page.goto("/_design");
    const canvas = () => page.locator("body").evaluate((el) => getComputedStyle(el).backgroundColor);
    await setTheme(page, "light");
    expect(await canvas()).toBe("rgb(255, 255, 255)");
    await setTheme(page, "dark");
    expect(await canvas()).toBe("rgb(0, 0, 0)");
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

  test("orb renders at 16, 32 and 128 px, in every mode tone, and speeds up when thinking", async ({ page }) => {
    await page.goto("/_design");
    for (const size of [16, 32, 128]) {
      const svg = page.getByTestId(`orb-${size}`).locator("svg");
      await expect(svg).toHaveAttribute("width", String(size));
      await expect(svg).toHaveAttribute("data-state", "idle");
    }
    for (const tone of ["lagoon", "ember", "moss", "coral", "glacier", "pearl"]) {
      await expect(page.getByTestId(`tone-${tone}`).locator("svg")).toHaveAttribute("data-tone", tone);
    }
    const orb = page.getByTestId("orb-128").locator("svg");
    const idle = await blobAnimation(orb);
    expect(idle.name).toBe("vt-orb-drift");

    await page.getByRole("button", { name: "Show thinking state" }).click();
    await expect(orb).toHaveAttribute("data-state", "thinking");
    const thinking = await blobAnimation(orb);
    expect(thinking.seconds).toBeLessThan(idle.seconds);
  });

  test("reduced motion stops the orb", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/_design");
    await page.getByRole("button", { name: "Show thinking state" }).click();
    expect((await blobAnimation(page.getByTestId("orb-128").locator("svg"))).name).toBe("none");
  });
});
