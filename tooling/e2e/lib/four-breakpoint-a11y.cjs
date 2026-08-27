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

  // Install before navigation so every Next document receives axe during
  // document creation. This avoids addScriptTag racing client-side redirects.
  await page.addInitScript({ path: require.resolve("axe-core") });

  for (const viewport of FOUR_BREAKPOINTS) {
    await open(viewport);
    await page.waitForFunction(
      () => Boolean(window.axe && typeof window.axe.run === "function"),
      null,
      { timeout: 10000 },
    );

    let results;
    let lastContextError = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        results = await page.evaluate(async () =>
          window.axe.run(document, {
            runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
          }),
        );
        lastContextError = null;
        break;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!/Execution context was destroyed|Cannot find context/i.test(message)) {
          throw error;
        }
        lastContextError = error;
        await page.waitForLoadState("domcontentloaded").catch(() => {});
        await page.waitForFunction(
          () => Boolean(window.axe && typeof window.axe.run === "function"),
          null,
          { timeout: 10000 },
        );
      }
    }
    if (!results) {
      const detail =
        lastContextError instanceof Error
          ? lastContextError.message
          : String(lastContextError || "unknown context error");
      throw new Error(
        `[${label}] unstable navigation ${viewport.name}: ${detail}`,
      );
    }
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
