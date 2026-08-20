/**
 * REL-102 — login Bootstrap.
 * LIVE_KAKAO_HUMAN_E2E는 이 스펙에서 PASS로 위조하지 않음.
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

test("login page wires session resume and magic link", () => {
  const page = read("apps/web/app/auth/login/page.tsx");
  const runtime = read("apps/web/app/auth/login/LoginRuntime.tsx");
  const kakao = read("apps/web/app/auth/oauth/kakao/page.tsx");
  expect(page).toContain("GuestChrome");
  expect(runtime).toContain("fetchAuthSession");
  expect(runtime).toContain("requestMagicLink");
  expect(runtime).toContain("startKakaoOAuth");
  expect(kakao).toContain("startKakaoOAuth");
  expect(kakao).not.toMatch(/\bOAuth\b|\bJWT\b|\bcallback\b/);
});

test("login axe fixture", async () => {
  const html = `<!doctype html><html lang="ko"><head><title>로그인</title></head>
  <body>
    <main>
      <h1>다시 오신 걸 환영해요</h1>
      <button type="button">카카오로 시작하기</button>
      <label>이메일<input type="email" /></label>
      <a href="/auth/signup">가입하기</a>
    </main>
  </body></html>`;
  const results = await runAxeOnHtml(html);
  expect(blockingViolations(results)).toEqual([]);
});

test("runtime login route when base URL is provided", async ({ page }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL;
  test.skip(!base, "PLAYWRIGHT_BASE_URL 없으면 로컬 웹 기동을 강제하지 않음");
  await page.setViewportSize({ width: 1440, height: 1080 });
  const res = await page.goto(new URL("/auth/login", base).toString(), {
    waitUntil: "domcontentloaded",
  });
  expect(res && res.ok()).toBeTruthy();
  await expect(page.getByTestId("auth-login")).toBeVisible();
});
