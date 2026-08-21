/**
 * REL-126 — Support (/me/support).
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const { blockingViolations } = require("../lib/axe-scan.cjs");

test.describe.configure({ timeout: 180000 });
let runtime;
test.beforeAll(async () => {
  assertQaIsolation({ purpose: "e2e", databaseUrl: "", projectRef: "" });
  runtime = await ensureLocalWebRuntime({ timeoutMs: 180000 });
}, { timeout: 180000 });
test.afterAll(async () => {
  if (runtime) await runtime.stop();
});

async function openSupport(page, path = "/me/support", width = 1440, height = 1080) {
  await page.setViewportSize({ width, height });
  await page.goto(`${runtime.baseUrl}${path}`, { waitUntil: "load" });
  await expect(page.getByTestId("support-page")).toBeVisible({ timeout: 20000 });
}

test("general support has no fake live chat", async ({ page }) => {
  await openSupport(page);
  await expect(page.getByText("바로 연결되는 상담 창은 없어요.")).toBeVisible();
  await expect(page.getByText("라이브 채팅")).toHaveCount(0);
  await expect(page.getByTestId("app-shell")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /입금이 다른 네트워크로 갔어요/ })).toBeVisible();
  await page.screenshot({
    path: "governance/release-master/rel-126-support/runtime-ready-1440.png",
    fullPage: false,
  });
  await openSupport(page, "/me/support", 390, 693);
  await page.screenshot({
    path: "governance/release-master/rel-126-support/runtime-ready-390.png",
    fullPage: false,
  });
});

test("wrong-chain entry keeps the deposit-dispute form", async ({ page }) => {
  await openSupport(
    page,
    "/me/support?category=deposit&kind=wrong_chain",
  );
  await expect(page.getByTestId("wrong-chain-form")).toBeVisible();
  await expect(page.getByTestId("wrong-chain-submit")).toBeVisible();
});

test("support a11y has no new critical/serious axe violations", async ({
  page,
}) => {
  await openSupport(page);
  await page.addScriptTag({ path: require.resolve("axe-core") });
  const results = await page.evaluate(async () => {
    return window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
    });
  });
  expect(blockingViolations(results), JSON.stringify(blockingViolations(results).map((v) => v.id))).toEqual([]);
});
