/**
 * REL-601 — staging Home viewport safety (preview workers only).
 * pixel-diff alone 0. Home geometry patch 0.
 */
const { test, expect } = require("@playwright/test");
const { loadMatrix, originFor } = require("../lib/staging-regression.cjs");

const matrix = loadMatrix();
const baseURL = originFor(matrix, "web");

test.describe.configure({ timeout: 120000 });
test.use({ baseURL });

for (const vp of matrix.homeViewports) {
  test(`home ${vp.id} overflow-safe`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    const fatals = [];
    page.on("pageerror", (err) => {
      fatals.push(String(err && err.message ? err.message : err));
    });
    const res = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(res && res.status() < 500).toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > window.innerWidth + 2;
    });
    expect(overflow, `${vp.id} horizontal overflow`).toBe(false);
    expect(fatals, `${vp.id} pageerror`).toEqual([]);
  });
}
