/**
 * REL-603 — automated age-band usability cohort runs on staging preview.
 * 9 cohorts × 4 scenarios (signup · opportunity · participate entry · wallet).
 * Human participants 0 · production mutation 0 · MCP-only evidence 0.
 */
const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { runAxeOnHtml, blockingViolations } = require("../lib/axe-scan.cjs");

const root = path.resolve(__dirname, "../../..");
const fixture = JSON.parse(
  fs.readFileSync(
    path.join(root, "tooling/verify/fixtures/rel-603-age-usability-spotcheck.v1.json"),
    "utf8",
  ),
);

const baseUrl =
  process.env.REL603_STAGING_WEB ||
  process.env.PLAYWRIGHT_BASE_URL ||
  fixture.stagingWeb;

test.beforeAll(() => {
  assertQaIsolation({ purpose: "e2e", databaseUrl: "", projectRef: "" });
  if (!baseUrl.includes("ai-profit-web-preview")) {
    throw new Error("REL-603 requires staging preview web origin");
  }
  for (const host of fixture.forbiddenHosts || []) {
    if (baseUrl.includes(host)) {
      throw new Error("REL-603 forbidden host " + host);
    }
  }
});

function forbiddenHit(html) {
  const lower = html.toLowerCase();
  for (const token of fixture.forbiddenTokens || []) {
    if (lower.includes(String(token).toLowerCase())) return token;
  }
  return null;
}

function includesAny(html, needles) {
  const lower = html.toLowerCase();
  return (needles || []).some((n) => lower.includes(String(n).toLowerCase()));
}

for (const cohort of fixture.cohorts || []) {
  test.describe(`REL-603 cohort ${cohort.id} (${cohort.ageBand})`, () => {
    test.use({ viewport: cohort.viewport });

    for (const scenario of fixture.scenarios || []) {
      test(`${scenario.id} ${scenario.title} @ ${scenario.path}`, async ({ page }) => {
        const url = baseUrl.replace(/\/$/, "") + scenario.path;
        const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
        expect(res, cohort.id + " " + scenario.id + " response").not.toBeNull();
        const status = res.status();
        expect(scenario.expectStatus).toContain(status);

        const html = await page.content();
        const bad = forbiddenHit(html);
        expect(bad, "forbidden token").toBeNull();
        expect(includesAny(html, scenario.mustIncludeAny)).toBeTruthy();

        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        );
        expect(overflow, cohort.id + " horizontal overflow").toBeFalsy();

        if (scenario.id === "S1") {
          const axe = await runAxeOnHtml(html);
          const blocking = blockingViolations(axe, []);
          expect(blocking, "S1 axe blocking").toHaveLength(0);
        }
      });
    }
  });
}
