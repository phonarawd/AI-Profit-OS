/**
 * Canon structure × multi-viewport — diffs block order, not pixels (ADR-013).
 * Run via tooling/verify/responsive/run-playwright.cjs (RESPONSIVE_PW=1).
 */
const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");
const {
  listHarnessSurfaces,
  fixtureHtml,
  BLOCK_ATTR,
  SURFACE_ATTR,
  LEGACY_BLOCK_ATTRS,
  repoRoot,
} = require("../../../../packages/ui/responsive/visual-regression/canon-structure.cjs");

const fixtureDir = path.join(__dirname, "..", ".fixtures");

test.beforeAll(() => {
  fs.mkdirSync(fixtureDir, { recursive: true });
  const surfaces = listHarnessSurfaces(repoRoot());
  for (const s of surfaces) {
    const html = fixtureHtml(s);
    fs.writeFileSync(path.join(fixtureDir, `${s.id}.html`), html, "utf8");
  }
});

const surfaces = listHarnessSurfaces(repoRoot());

for (const surface of surfaces) {
  test.describe(`canon:${surface.id}`, () => {
    test(`block order matches wire (${surface.blocks.length} blocks)`, async ({
      page,
    }) => {
      const fileUrl =
        "file://" +
        path.join(fixtureDir, `${surface.id}.html`).replace(/\\/g, "/");
      await page.goto(fileUrl);

      const surfaceEl = page.locator(`[${SURFACE_ATTR}="${surface.id}"]`);
      await expect(surfaceEl).toHaveCount(1);

      const selectors = [
        `[${BLOCK_ATTR}]`,
        ...LEGACY_BLOCK_ATTRS.map((a) => `[${a}]`),
      ].join(", ");

      const ids = await page.locator(selectors).evaluateAll((nodes) =>
        nodes.map((n) => {
          for (const attr of [
            "data-canon-block",
            "data-landing-block",
          ]) {
            const v = n.getAttribute(attr);
            if (v) return v;
          }
          return "";
        }),
      );

      expect(ids.filter(Boolean)).toEqual(surface.blocks);

      // Ultrawide / desktop: content rail must not stretch infinitely
      const vp = page.viewportSize();
      if (vp && vp.width >= 1920) {
        const maxW = await page
          .locator(".pd-app-main")
          .evaluate((el) => getComputedStyle(el).maxWidth);
        expect(maxW).toBe("1680px");
      }
    });
  });
}
