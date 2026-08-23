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
  {
    route: "/auth/login",
    testId: "auth-login",
    variant: "login",
    rel: "rel-102-login",
    shotDesktop: "governance/release-master/rel-102-login/runtime-desktop-1440.png",
    shotMobile: "governance/release-master/rel-102-login/runtime-mobile-390.png",
  },
  {
    route: "/auth/signup",
    testId: "auth-signup",
    variant: "signup",
    rel: "rel-101-signup",
    shotDesktop: "governance/release-master/rel-101-signup/runtime-desktop-1440.png",
    shotMobile: "governance/release-master/rel-101-signup/runtime-mobile-390.png",
  },
  {
    route: "/auth/complete-profile",
    testId: "auth-complete-profile",
    variant: "complete-profile",
    rel: "rel-103-complete-profile",
    shotDesktop:
      "governance/release-master/rel-103-complete-profile/runtime-desktop-1440.png",
    shotMobile:
      "governance/release-master/rel-103-complete-profile/runtime-mobile-390.png",
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
    expect(read("apps/web/components/spark-dash-auth/shell-copy.ts")).toContain(
      "authShellCopy",
    );
    expect(read("packages/ui/copy/ko/auth-shell.ts")).toContain("loginBrandNote");
  });
}

async function hideNextDevChrome(page) {
  await page
    .addStyleTag({
      content:
        "nextjs-portal, [data-next-mark-loading], #__next-build-watcher { display: none !important; pointer-events: none !important; }",
    })
    .catch(() => {});
}

async function stubAuthSession(page, onboardingStage) {
  await page.route("**/api/v1/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        sessionId: "qa-auth-shell",
        userId: "qa-auth-user",
        issuer: "ai-profit-os-nest",
        issuedAt: "2026-08-21T00:00:00.000Z",
        expiresAt: "2026-08-22T00:00:00.000Z",
        revoked: false,
        onboardingStage,
      }),
    });
  });
}

for (const { route, testId, variant, shotDesktop, shotMobile } of AUTH_ROUTES) {
  test(`${route} runtime desktop shell + screenshot`, async ({ page }) => {
    const base = process.env.PLAYWRIGHT_BASE_URL;
    test.skip(!base, "PLAYWRIGHT_BASE_URL 없으면 로컬 웹 기동을 강제하지 않음");

    if (variant === "complete-profile") {
      await stubAuthSession(page, "B_incomplete");
    }

    await page.setViewportSize({ width: 1440, height: 1080 });
    const res = await page.goto(new URL(route, base).toString(), {
      waitUntil: "domcontentloaded",
    });
    expect(res && res.ok()).toBeTruthy();
    await hideNextDevChrome(page);
    await expect(page.getByTestId("auth-shell")).toBeVisible();
    await expect(page.getByTestId("auth-shell")).toHaveAttribute(
      "data-auth-variant",
      variant,
    );
    await expect(page.getByTestId("auth-shell")).toHaveAttribute(
      "data-auth-layout",
      "desktop",
    );
    await expect(page.getByTestId(testId)).toBeVisible();
    await page.screenshot({ path: shotDesktop, fullPage: false });
  });

  test(`${route} runtime mobile shell + screenshot`, async ({ page }) => {
    const base = process.env.PLAYWRIGHT_BASE_URL;
    test.skip(!base, "PLAYWRIGHT_BASE_URL 없으면 로컬 웹 기동을 강제하지 않음");

    if (variant === "complete-profile") {
      await stubAuthSession(page, "B_incomplete");
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(new URL(route, base).toString(), {
      waitUntil: "domcontentloaded",
    });
    await hideNextDevChrome(page);
    await expect(page.getByTestId("auth-shell")).toHaveAttribute(
      "data-auth-layout",
      "mobile",
    );
    await expect(page.getByTestId(testId)).toBeVisible();
    await page.screenshot({ path: shotMobile, fullPage: false });
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
    if (msg.type() === "error") {
      const text = msg.text();
      if (text.includes("503") && text.includes("Failed to load resource")) {
        return;
      }
      consoleErrors.push(text);
    }
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
