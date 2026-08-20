/**
 * REL-103 — complete-profile Bootstrap.
 * 로컬 저장만으로 완료를 선언하지 않음. PATCH 소유 = Nest.
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

test("complete-profile runtime saves through Nest PATCH", () => {
  const page = read("apps/web/app/auth/complete-profile/page.tsx");
  const runtime = read(
    "apps/web/app/auth/complete-profile/CompleteProfileRuntime.tsx",
  );
  const ui = read("packages/ui/components/auth/AuthCompleteProfile.tsx");
  expect(page).toContain("GuestChrome");
  expect(runtime).toContain("patchAuthProfile");
  expect(runtime).toContain('"/onboarding"');
  expect(ui).toContain('data-stage="B"');
  expect(ui).not.toMatch(/성별|gender|주민/);
  expect(runtime).not.toMatch(/성별/);
});

test("complete-profile axe fixture", async () => {
  const html = `<!doctype html><html lang="ko"><head><title>프로필</title></head>
  <body>
    <main>
      <h1>기본 정보만 남겨 주세요</h1>
      <form>
        <label>이름<input name="displayName" /></label>
        <label>휴대폰 번호<input name="phone" type="tel" /></label>
        <label>생년월일<input name="birthDate" type="date" /></label>
        <button type="submit">저장하고 계속</button>
      </form>
    </main>
  </body></html>`;
  const results = await runAxeOnHtml(html);
  expect(blockingViolations(results)).toEqual([]);
});

test("runtime complete-profile route when base URL is provided", async ({
  page,
}) => {
  const base = process.env.PLAYWRIGHT_BASE_URL;
  test.skip(!base, "PLAYWRIGHT_BASE_URL 없으면 로컬 웹 기동을 강제하지 않음");
  const res = await page.goto(new URL("/auth/complete-profile", base).toString(), {
    waitUntil: "domcontentloaded",
  });
  expect(res && res.ok()).toBeTruthy();
});
