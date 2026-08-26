/**
 * REL-128 — Legal (/me/legal*).
 */
const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { ensureLocalWebRuntime } = require("../lib/local-web-runtime.cjs");
const { blockingViolations } = require("../lib/axe-scan.cjs");

const ROOT = path.resolve(__dirname, "../../..");
const entity = require(path.join(ROOT, "schemas/operator-entity.instance.json"));
const legalSrc = fs.readFileSync(path.join(ROOT, "packages/ui/copy/ko/legal.ts"), "utf8");
const operatorSrc = fs.readFileSync(path.join(ROOT, "packages/ui/copy/ko/operator.ts"), "utf8");
const commonSrc = fs.readFileSync(path.join(ROOT, "packages/ui/copy/ko/common.ts"), "utf8");

function quoted(src, key) {
  const match = src.match(new RegExp(key + ':\\s*"([^"]+)"'));
  if (!match) throw new Error("legal-closure spec missing copy key " + key);
  return match[1];
}

const COPY = {
  hubTitle: quoted(legalSrc, "hubTitle"),
  termsTitle: quoted(legalSrc, "termsTitle"),
  privacyTitle: quoted(legalSrc, "privacyTitle"),
  ossTitle: quoted(legalSrc, "ossTitle"),
  licenseTitle: quoted(legalSrc, "licenseTitle"),
  termsIntro: quoted(legalSrc.slice(legalSrc.indexOf("terms:")), "intro"),
  privacyIntro: quoted(legalSrc.slice(legalSrc.indexOf("privacy:")), "intro"),
  ossIntro: quoted(legalSrc.slice(legalSrc.indexOf("oss:")), "intro"),
  ossBody: quoted(legalSrc.slice(legalSrc.indexOf("oss:")), "body"),
  taxDisclaimer: quoted(legalSrc, "taxDisclaimer"),
  footerLine: quoted(legalSrc, "footerLine"),
  pageTitle: quoted(operatorSrc.slice(operatorSrc.indexOf("license:")), "pageTitle"),
  pageSubtitle: quoted(operatorSrc.slice(operatorSrc.indexOf("license:")), "pageSubtitle"),
  disclaimer: quoted(operatorSrc, "disclaimer"),
  printLink: quoted(operatorSrc, "printLink"),
  backToLegal: quoted(operatorSrc, "backToLegal"),
  statusActive: quoted(operatorSrc, "statusActive"),
  statusPending: quoted(operatorSrc, "statusPending"),
  back: quoted(commonSrc, "back"),
};

test.describe.configure({ timeout: 180000 });
let runtime;
test.beforeAll(async () => {
  assertQaIsolation({ purpose: "e2e", databaseUrl: "", projectRef: "" });
  runtime = await ensureLocalWebRuntime({ timeoutMs: 180000 });
}, { timeout: 180000 });
test.afterAll(async () => {
  if (runtime) await runtime.stop();
});

async function openLegal(page, pathName, width = 1440, height = 1080) {
  await page.setViewportSize({ width, height });
  await page.goto(runtime.baseUrl + pathName, { waitUntil: "load" });
}

async function assertSurface(page, testId) {
  const root = page.getByTestId(testId);
  await expect(root).toBeVisible({ timeout: 20000 });
  await expect(root).toHaveAttribute("data-account-view", "ready");
  await expect(page.getByTestId("app-shell")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

async function assertNoOverflow(page) {
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const heading = document.querySelector("h1");
    const nodes = [...document.querySelectorAll("main, h1, h2, p, a, li, dd")];
    const clipped = nodes.some((el) => {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return false;
      return r.right > window.innerWidth + 2 || r.left < -2;
    });
    return {
      overflowX: doc.scrollWidth - doc.clientWidth,
      clipped,
      headingVisible: !!(heading && heading.getClientRects().length),
    };
  });
  expect(metrics.overflowX).toBeLessThanOrEqual(1);
  expect(metrics.clipped).toBeFalsy();
  expect(metrics.headingVisible).toBeTruthy();
}

async function assertNoFakeLegal(page) {
  await expect(page.getByText("\uAE08\uC735\uAC10\uB3C5\uC6D0")).toHaveCount(0);
  await expect(page.getByText("\uC815\uBD80 \uC778\uC99D")).toHaveCount(0);
  await expect(page.getByText("\uB77C\uC774\uBE0C \uCC44\uD305")).toHaveCount(0);
  await expect(page.getByText("0 USDT")).toHaveCount(0);
  await expect(page.getByText("0 KRW")).toHaveCount(0);
  await expect(page.getByText("\uC218\uC775 \uBCF4\uC7A5")).toHaveCount(0);
}

async function runAxe(page) {
  await page.addScriptTag({ path: require.resolve("axe-core") });
  const results = await page.evaluate(async () => {
    return window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
    });
  });
  expect(
    blockingViolations(results),
    JSON.stringify(blockingViolations(results).map((v) => v.id)),
  ).toEqual([]);
}

const ROUTES = [
  ["/me/legal", "legal-hub"],
  ["/me/legal/terms", "legal-terms"],
  ["/me/legal/privacy", "legal-privacy"],
  ["/me/legal/oss", "legal-oss"],
  ["/me/legal/license", "legal-license"],
];

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 1080 },
];

const HUB_HREFS = [
  "/me/legal/terms",
  "/me/legal/privacy",
  "/me/legal/oss",
  "/me/legal/license",
];

test("all 5 legal routes mount without leftover chrome", async ({ page }) => {
  for (const [pathName, testId] of ROUTES) {
    await openLegal(page, pathName);
    await assertSurface(page, testId);
    await assertNoOverflow(page);
    await assertNoFakeLegal(page);
  }
  await openLegal(page, "/me/legal");
  await page.screenshot({
    path: "governance/release-master/rel-128-legal/runtime-ready-1440.png",
    fullPage: false,
  });
  await openLegal(page, "/me/legal", 390, 693);
  await page.screenshot({
    path: "governance/release-master/rel-128-legal/runtime-ready-390.png",
    fullPage: false,
  });
});

test("legal hub keeps the four existing destinations", async ({ page }) => {
  await openLegal(page, "/me/legal");
  await assertSurface(page, "legal-hub");
  await expect(page.getByRole("heading", { name: COPY.hubTitle })).toBeVisible();
  await expect(page.locator('a[href="/me/legal/terms"]')).toBeVisible();
  await expect(page.locator('a[href="/me/legal/privacy"]')).toBeVisible();
  await expect(page.locator('a[href="/me/legal/oss"]')).toBeVisible();
  await expect(page.locator('a[href="/me/legal/license"]')).toBeVisible();
  await expect(page.getByRole("link", { name: COPY.termsTitle })).toHaveAttribute("href", "/me/legal/terms");
  await expect(page.getByRole("link", { name: COPY.privacyTitle })).toHaveAttribute("href", "/me/legal/privacy");
  await expect(page.getByRole("link", { name: COPY.ossTitle })).toHaveAttribute("href", "/me/legal/oss");
  await expect(page.getByRole("link", { name: COPY.licenseTitle })).toHaveAttribute("href", "/me/legal/license");
});

test("legal hub a11y has no new critical/serious axe violations", async ({
  page,
}) => {
  await openLegal(page, "/me/legal");
  await assertSurface(page, "legal-hub");
  await runAxe(page);
});

test("terms privacy oss keep LegalDoc ownership and return to hub", async ({ page }) => {
  const docs = [
    ["/me/legal/terms", "legal-terms", COPY.termsTitle, COPY.termsIntro, true],
    ["/me/legal/privacy", "legal-privacy", COPY.privacyTitle, COPY.privacyIntro, true],
    ["/me/legal/oss", "legal-oss", COPY.ossTitle, COPY.ossIntro, false],
  ];
  for (const [pathName, testId, title, intro, showTax] of docs) {
    await openLegal(page, pathName);
    await assertSurface(page, testId);
    const doc = page.getByTestId("legal-doc");
    await expect(doc).toBeVisible();
    await expect(doc.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(doc.getByText(intro)).toBeVisible();
    await expect(doc.getByText(COPY.footerLine)).toBeVisible();
    if (showTax) await expect(doc.getByText(COPY.taxDisclaimer)).toBeVisible();
    if (pathName === "/me/legal/oss") await expect(doc.getByText(COPY.ossBody)).toBeVisible();
    await doc.getByRole("link", { name: COPY.back }).click();
    await expect(page).toHaveURL(/\/me\/legal\/?$/);
    await assertSurface(page, "legal-hub");
  }
});

test("license page uses current operator entity only", async ({ page }) => {
  await openLegal(page, "/me/legal/license");
  await assertSurface(page, "legal-license");
  await expect(page.getByRole("heading", { name: COPY.pageTitle })).toBeVisible();
  await expect(page.getByText(COPY.pageSubtitle)).toBeVisible();
  await expect(page.getByText(COPY.disclaimer)).toBeVisible();
  await expect(page.getByText(entity.legalName, { exact: true })).toBeVisible();
  await expect(page.getByText(entity.licenseNumber, { exact: true })).toBeVisible();
  const statusLabel =
    entity.licenseStatus === "active" ? COPY.statusActive : COPY.statusPending;
  await expect(page.getByText(statusLabel, { exact: true })).toBeVisible();
  for (const activity of entity.licensedActivities) {
    await expect(page.getByText(activity.activityKo).first()).toBeVisible();
    await expect(page.getByText(activity.activityEn, { exact: true }).first()).toBeVisible();
  }
  for (const address of entity.addresses) {
    await expect(page.getByText(address.lines[0])).toBeVisible();
    await expect(page.getByText(address.city).first()).toBeVisible();
  }
  for (const item of entity.verificationUrls) {
    const link = page.getByRole("link", { name: item.label });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", item.url);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
    await expect(link).toHaveAttribute("rel", /noreferrer/);
  }
  const print = page.getByRole("link", { name: COPY.printLink });
  await expect(print).toBeVisible();
  await expect(print).toHaveAttribute("href", "/kyb/trade-license-1135431.html");
  await expect(print).toHaveAttribute("rel", /noopener/);
  await expect(print).toHaveAttribute("rel", /noreferrer/);
  await page.getByRole("link", { name: COPY.backToLegal }).click();
  await expect(page).toHaveURL(/\/me\/legal\/?$/);
  await assertSurface(page, "legal-hub");
});

test("legal terms a11y has no new critical/serious axe violations", async ({ page }) => {
  await openLegal(page, "/me/legal/terms");
  await assertSurface(page, "legal-terms");
  await runAxe(page);
});

test("legal privacy a11y has no new critical/serious axe violations", async ({ page }) => {
  await openLegal(page, "/me/legal/privacy");
  await assertSurface(page, "legal-privacy");
  await runAxe(page);
});

test("legal oss a11y has no new critical/serious axe violations", async ({ page }) => {
  await openLegal(page, "/me/legal/oss");
  await assertSurface(page, "legal-oss");
  await runAxe(page);
});

test("legal license a11y has no new critical/serious axe violations", async ({ page }) => {
  await openLegal(page, "/me/legal/license");
  await assertSurface(page, "legal-license");
  await runAxe(page);
});

for (const vp of VIEWPORTS) {
  test("legal responsive " + vp.width, async ({ page }) => {
    for (const [pathName, testId] of ROUTES) {
      await openLegal(page, pathName, vp.width, vp.height);
      await assertSurface(page, testId);
      await assertNoOverflow(page);
      await assertNoFakeLegal(page);
      if (pathName === "/me/legal") {
        for (const href of HUB_HREFS) {
          await expect(page.locator('a[href="' + href + '"]')).toBeVisible();
        }
      }
      if (pathName === "/me/legal/license") {
        await expect(page.getByText(entity.licenseNumber, { exact: true })).toBeVisible();
        await expect(page.getByText(entity.legalName, { exact: true })).toBeVisible();
        await expect(page.getByText(entity.primaryActivityEn).first()).toBeVisible();
        await expect(page.getByText(entity.addresses[1].lines[2])).toBeVisible();
      }
    }
  });
}
