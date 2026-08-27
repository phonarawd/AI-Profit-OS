/**
 * Shared browser A11Y closure for consumer money/account surfaces.
 * Four breakpoints are mandatory: 390 / 768 / 1024 / 1440.
 * Each viewport must have critical/serious axe = 0 and horizontal overflow = 0.
 */
const { blockingViolations } = require("./axe-scan.cjs");

const FOUR_BREAKPOINTS = Object.freeze([
  { name: "mobile-390", width: 390, height: 693 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "tablet-1024", width: 1024, height: 768 },
  { name: "desktop-1440", width: 1440, height: 1080 },
]);

function compactViolations(violations) {
  return violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: (v.nodes || []).map((n) => ({
      target: n.target,
      html: String(n.html || "").slice(0, 160),
    })),
  }));
}

async function assertFourBreakpointA11y({ page, open, label }) {
  if (!page || typeof open !== "function") {
    throw new Error("assertFourBreakpointA11y requires page + open(viewport)");
  }

  for (const viewport of FOUR_BREAKPOINTS) {
    await open(viewport);
    await page.addScriptTag({ path: require.resolve("axe-core") });

    const results = await page.evaluate(async () =>
      window.axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
      }),
    );
    const blocking = blockingViolations(results);
    if (blocking.length) {
      throw new Error(
        `[${label}] axe ${viewport.name}: ${JSON.stringify(compactViolations(blocking))}`,
      );
    }

    const overflow = await page.evaluate(() => {
      const root = document.documentElement;
      const body = document.body;
      return {
        clientWidth: root.clientWidth,
        scrollWidth: Math.max(root.scrollWidth, body ? body.scrollWidth : 0),
      };
    });
    if (overflow.scrollWidth > overflow.clientWidth + 1) {
      throw new Error(
        `[${label}] horizontal overflow ${viewport.name}: scroll=${overflow.scrollWidth} client=${overflow.clientWidth}`,
      );
    }
  }
}

module.exports = {
  FOUR_BREAKPOINTS,
  assertFourBreakpointA11y,
};
