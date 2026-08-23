/**
 * Spark Dash Auth — Figma REL-101/102/103 regression harness.
 * Screenshot compare = CI artifact when PLAYWRIGHT_BASE_URL set.
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

const AUTH_ROUTES = [
  { route: "/auth/login", testId: "auth-login", variant: "login" },
  { route: "/auth/signup", testId: "auth-signup", variant: "signup" },
  {
    route: "/auth/complete-profile",
    testId: "auth-complete-profile",
    variant: "complete-profile",
  },
];

for (const { route, testId, variant } of AUTH_ROUTES) {
  test(`${route} wires Spark Dash AuthShell + embedded canon`, () => {
    const segment = route.replace(/^\/auth\//, "");
    const page = read(`apps/web/app/auth/${segment}/page.tsx`);
    expect(page).toContain('variant="' + variant + '"');
    expect(page).toContain("GuestChrome");
    expect(read("apps/web/app/components/GuestChrome.tsx")).toContain("AuthShell");
    expect(
      read("apps/web/components/spark-dash-auth/AuthShell.tsx"),
    ).toContain("data-auth-variant");
  });
}

test("login bootstrap expects auth-shell on runtime", async ({ page }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL;
  test.skip(!base, "PLAYWRIGHT_BASE_URL 없으면 로컬 웹 기동을 강제하지 않음");

  await page.setViewportSize({ width: 1440, height: 1080 });
  const res = await page.goto(new URL("/auth/login", base).toString(), {
    waitUntil: "domcontentloaded",
  });
  expect(res && res.ok()).toBeTruthy();
  await expect(page.getByTestId("auth-shell")).toBeVisible();
  await expect(page.getByTestId("auth-shell")).toHaveAttribute(
    "data-auth-variant",
    "login",
  );
  await expect(page.getByTestId("auth-login")).toBeVisible();
  await expect(page.getByTestId("auth-kakao-primary")).toBeVisible();

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  await page.waitForTimeout(500);
  expect(consoleErrors).toEqual([]);
});

test("auth login mobile viewport shell", async ({ page }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL;
  test.skip(!base, "PLAYWRIGHT_BASE_URL 없으면 로컬 웹 기동을 강제하지 않음");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(new URL("/auth/login", base).toString(), {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByTestId("auth-shell")).toHaveAttribute(
    "data-auth-layout",
    "mobile",
  );
});

test("auth spark axe fixture", async () => {
  const html = `<!doctype html><html lang="ko"><head><title>로그인</title></head>
  <body>
    <div data-testid="auth-shell" data-auth-variant="login">
      <main data-testid="auth-login">
        <button type="button">카카오로 시작하기</button>
        <a href="/auth/signup">아직 계정이 없나요? 가입하기</a>
      </main>
    </div>
  </body></html>`;
  const results = await runAxeOnHtml(html);
  expect(blockingViolations(results)).toEqual([]);
});
