/**
 * REL-100 — 게스트 랜딩 클로저.
 * Home 시각 변경 0. 브라우저 실방문은 PLAYWRIGHT_BASE_URL 있을 때만.
 */
const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { runAxeOnHtml, blockingViolations } = require("../lib/axe-scan.cjs");

const root = path.resolve(__dirname, "../../..");

test.beforeAll(() => {
  assertQaIsolation({ purpose: "e2e", databaseUrl: "", projectRef: "" });
});

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("guest Home empty model does not invent money or fixture profit", () => {
  const home = read("apps/web/app/HomeDesktopClient.tsx");
  const empty = read("apps/web/components/spark-dash-home/map-runtime.ts");
  expect(home).toContain("emptyRuntimeModel");
  expect(home).toContain("GuestFirstVisit");
  expect(home).not.toContain("SPARK_DASH_DESKTOP_VISUAL_FIXTURE");
  expect(empty).toMatch(/usdt:\s*null/);
  expect(empty).toContain("hero: null");
  expect(empty).not.toContain("2,450.00");
});

test("guest can reach signup and login from first-visit entry", () => {
  const guest = read("apps/web/app/GuestFirstVisit.tsx");
  expect(guest).toContain("/auth/signup");
  expect(guest).toContain("/auth/login");
  expect(guest).toContain("guest-cta-signup");
  expect(guest).toContain("guest-cta-login");
  expect(fs.existsSync(path.join(root, "apps/web/app/auth/signup/page.tsx"))).toBeTruthy();
  expect(fs.existsSync(path.join(root, "apps/web/app/auth/login/page.tsx"))).toBeTruthy();
});

test("390 and 1440 viewports are part of the landing contract", () => {
  const freeze = JSON.parse(
    read("governance/consumer-home-approval/home-approval-freeze.v1.json"),
  );
  expect(freeze.viewports.mobilePrimary).toEqual({ width: 390, height: 693 });
  expect(freeze.viewports.desktopPrimary).toEqual({ width: 1440, height: 1080 });
});

test("guest landing copy has no critical axe issues on a labeled fixture", async () => {
  const html = `<!doctype html><html lang="ko"><head><title>퍼뜩</title></head>
  <body>
    <main>
      <h1>퍼뜩</h1>
      <p>여러 사이트를 돌아다니지 않고 확인</p>
      <a href="/auth/signup">가입하고 시작하기</a>
      <a href="/auth/login">로그인</a>
    </main>
  </body></html>`;
  const results = await runAxeOnHtml(html);
  expect(blockingViolations(results)).toEqual([]);
});

test("runtime guest routes respond when a base URL is provided", async ({
  page,
}) => {
  const base = process.env.PLAYWRIGHT_BASE_URL;
  test.skip(!base, "PLAYWRIGHT_BASE_URL 없으면 로컬 웹 기동을 강제하지 않음");
  for (const [width, height] of [
    [390, 693],
    [1440, 1080],
  ]) {
    await page.setViewportSize({ width, height });
    const home = await page.goto(new URL("/", base).toString(), {
      waitUntil: "domcontentloaded",
    });
    expect(home && home.ok()).toBeTruthy();
    await expect(page.locator("body")).not.toContainText("2,450.00");
    await expect(page.getByTestId("guest-cta-signup")).toBeVisible();
    await expect(page.getByTestId("guest-cta-login")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    );
    expect(overflow).toBeTruthy();
  }
});
