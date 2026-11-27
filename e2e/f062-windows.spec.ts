import { expect, test, type Locator, type Page } from "@playwright/test";
import { signUpWithWorkspace, trackConsoleErrors } from "./helpers";

const animationName = (window: Locator) => window.evaluate((el) => getComputedStyle(el).animationName);

/** Clicks "Close window" and reads the animation on the next frame, before the window unmounts. */
const closeAndReadAnimation = (window: Locator) =>
  window.evaluate(
    (el) =>
      new Promise<string>((resolve) => {
        el.querySelector<HTMLButtonElement>('button[aria-label="Close window"]')!.click();
        requestAnimationFrame(() => resolve(getComputedStyle(el).animationName));
      }),
  );

const dockDot = (page: Page, app: string) =>
  page.getByRole("navigation", { name: "Apps" }).getByRole("link", { name: app, exact: true }).locator("span").first();

async function openMailOnEmptyDesktop(page: Page): Promise<Locator> {
  await signUpWithWorkspace(page);
  const home = page.getByRole("region", { name: "Home window" });
  await home.getByRole("button", { name: "Close window" }).click();
  await expect(page.getByText("This desktop is empty")).toBeVisible();
  await expect(dockDot(page, "Mail")).toHaveClass(/opacity-0/);

  await page.getByRole("navigation", { name: "Apps" }).getByRole("link", { name: "Mail", exact: true }).click();
  return page.locator("section.vt-window");
}

test.describe("F062 windows with tabs and motion", () => {
  test("opens with motion, manages tabs and closes with motion", async ({ page }) => {
    test.slow();
    const errors = trackConsoleErrors(page);
    const window = await openMailOnEmptyDesktop(page);
    await expect(page.getByRole("region", { name: "Mail window" })).toBeVisible();
    expect(await animationName(window)).toBe("vt-window-in");
    await expect(dockDot(page, "Mail")).toHaveClass(/opacity-100/);

    await window.getByRole("button", { name: "Open an app in this window" }).click();
    await window.locator("[popover]").getByRole("button", { name: "Docs", exact: true }).click();
    const tabs = window.getByRole("group", { name: "Open tabs" });
    await expect(tabs.getByRole("button", { name: "Docs", exact: true })).toHaveAttribute("aria-current", "true");
    await expect(page.getByRole("region", { name: "Docs window" })).toBeVisible();
    await expect(page).toHaveURL(/\/docs$/);

    await tabs.getByRole("button", { name: "Mail", exact: true }).click();
    await expect(tabs.getByRole("button", { name: "Mail", exact: true })).toHaveAttribute("aria-current", "true");
    await expect(page).toHaveURL(/\/mail$/);

    await tabs.getByRole("button", { name: "Close Docs tab" }).click();
    await expect(tabs.getByRole("button", { name: "Docs", exact: true })).toHaveCount(0);
    await expect(dockDot(page, "Docs")).toHaveClass(/opacity-0/);

    expect(await closeAndReadAnimation(window)).toBe("vt-window-out");
    await expect(window).toHaveCount(0);
    await expect(page.getByText("This desktop is empty")).toBeVisible();
    await expect(dockDot(page, "Mail")).toHaveClass(/opacity-0/);
    expect(errors).toEqual([]);
  });

  test("reduced motion opens and closes with opacity only", async ({ page }) => {
    test.slow();
    await page.emulateMedia({ reducedMotion: "reduce" });
    const window = await openMailOnEmptyDesktop(page);
    await expect(page.getByRole("region", { name: "Mail window" })).toBeVisible();
    expect(await animationName(window)).toBe("vt-fade-in");
    expect(await closeAndReadAnimation(window)).toBe("vt-fade-out");
    await expect(window).toHaveCount(0);
  });
});
