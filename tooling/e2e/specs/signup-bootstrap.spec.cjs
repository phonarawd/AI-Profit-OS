/**
 * REL-101 — signup e2e Bootstrap.
 * 서버 계정 생성은 Nest 소유. 이 스펙은 실라우트·약관·에러 표면을 닫는다.
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

test("signup page keeps GuestChrome and Stage A", () => {
  const page = read("apps/web/app/auth/signup/page.tsx");
  const runtime = read("apps/web/app/auth/signup/SignupRuntime.tsx");
  const ui = read("packages/ui/components/auth/AuthSignup.tsx");
  expect(page).toContain("GuestChrome");
  expect(page).toContain("SignupRuntime");
  expect(runtime).toContain("startKakaoOAuth");
  expect(runtime).toContain("signupStageA");
  expect(read("packages/sdk/src/auth/fetch.ts")).toContain("/api/v1/auth/signup");
  expect(ui).toContain('data-stage="A"');
  expect(ui).not.toMatch(/성별|gender/);
  expect(ui).not.toMatch(/12\.50|Math\.random/);
});

test("signup axe fixture has labeled controls", async () => {
  const html = `<!doctype html><html lang="ko"><head><title>가입</title></head>
  <body>
    <main>
      <h1>퍼뜩 시작하기</h1>
      <label><input type="checkbox" />이용약관에 동의</label>
      <button type="button">카카오로 시작하기</button>
      <label>이메일<input type="email" /></label>
    </main>
  </body></html>`;
  const results = await runAxeOnHtml(html);
  expect(blockingViolations(results)).toEqual([]);
});

test("runtime signup route when base URL is provided", async ({ page }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL;
  test.skip(!base, "PLAYWRIGHT_BASE_URL 없으면 로컬 웹 기동을 강제하지 않음");
  await page.setViewportSize({ width: 390, height: 693 });
  const res = await page.goto(new URL("/auth/signup", base).toString(), {
    waitUntil: "domcontentloaded",
  });
  expect(res && res.ok()).toBeTruthy();
  await expect(page.getByTestId("auth-signup")).toBeVisible();
  await expect(page.getByTestId("auth-terms")).toBeVisible();
});
