import { expect, test, type Page } from "@playwright/test";
import { signUpWithWorkspace, trackConsoleErrors } from "./helpers";

const MIN_PANE_PX = 320;

/** Resolves when the layout save carrying a split inside (min, max) percent has been stored. */
const savedSplit = (page: Page, min: number, max: number) =>
  page.waitForResponse((res) => {
    const req = res.request();
    if (req.method() !== "PATCH" || !res.url().includes("/desktops/") || !res.ok()) return false;
    const split = Math.round(Number((req.postDataJSON() as { layout?: { split?: number } }).layout?.split) * 100);
    return split > min && split < max;
  });

test.describe("F013 split view with two apps", () => {
  test("opens beside, resizes with a minimum, persists and fills on close", async ({ page }) => {
    test.slow();
    const errors = trackConsoleErrors(page);
    await signUpWithWorkspace(page);
    const dock = page.getByRole("navigation", { name: "Apps" });

    await dock.getByRole("link", { name: "Docs", exact: true }).click();
    await expect(page).toHaveURL(/\/docs$/);
    await dock.getByRole("link", { name: "Agent", exact: true }).click({ button: "right" });
    await page.getByRole("button", { name: "Open beside" }).click();

    const docs = page.getByRole("region", { name: "Docs window" });
    const agent = page.getByRole("region", { name: "Agent window" });
    await expect(docs).toBeVisible();
    await expect(agent).toBeVisible();
    await expect(page).toHaveURL(/\/agent$/);

    const divider = page.getByRole("separator", { name: "Resize windows" });
    const handle = (await divider.boundingBox())!;
    const y = handle.y + handle.height / 2;
    const drag = async (toX: number) => {
      const from = (await divider.boundingBox())!;
      await page.mouse.move(from.x + from.width / 2, y);
      await page.mouse.down();
      await page.mouse.move(toX, y, { steps: 8 });
      await page.mouse.up();
    };

    // Dragging past either edge stops each window at its minimum width.
    await drag(0);
    await expect.poll(async () => (await docs.boundingBox())!.width).toBeLessThan(MIN_PANE_PX + 12);
    expect((await docs.boundingBox())!.width).toBeGreaterThanOrEqual(MIN_PANE_PX - 1);
    await drag(page.viewportSize()!.width);
    await expect.poll(async () => (await agent.boundingBox())!.width).toBeLessThan(MIN_PANE_PX + 12);
    expect((await agent.boundingBox())!.width).toBeGreaterThanOrEqual(MIN_PANE_PX - 1);

    // A drag to 60% of the stage is what comes back after a reload.
    const stage = (await page.getByRole("main").boundingBox())!;
    const saved = savedSplit(page, 50, 70);
    await drag(stage.x + stage.width * 0.6);
    await saved;
    const split = Number(await divider.getAttribute("aria-valuenow"));
    expect(split).toBeGreaterThan(50);
    expect(split).toBeLessThan(70);

    await page.reload();
    await expect(docs).toBeVisible();
    await expect(agent).toBeVisible();
    await expect(divider).toHaveAttribute("aria-valuenow", String(split));

    // Keyboard resizing works too.
    await divider.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(divider).toHaveAttribute("aria-valuenow", String(split - 2));

    await agent.getByRole("button", { name: "Close window" }).click();
    await expect(agent).toHaveCount(0);
    await expect(divider).toHaveCount(0);
    await expect(page).toHaveURL(/\/docs$/);
    const main = (await page.getByRole("main").boundingBox())!;
    expect((await docs.boundingBox())!.width).toBeGreaterThan(main.width * 0.9);
    expect(errors).toEqual([]);
  });
});
