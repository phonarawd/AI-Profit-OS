/**
 * verify:settings-closure — REL-125
 * /me/settings prefs persist · logout/delete owners · leftover chrome 0.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "../..");
const fails = [];
const fail = (msg) => fails.push(msg);
const read = (rel) => {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) {
    fail(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(fp, "utf8");
};

for (const f of [
  "apps/web/app/me/settings/page.tsx",
  "apps/web/app/me/settings/SettingsClient.tsx",
  "packages/ui/components/settings/SettingsPanel.tsx",
  "packages/ui/components/settings/notification-prefs-state.ts",
  "packages/ui/components/settings/notification-prefs.runtime.test.ts",
  "packages/ui/components/settings/ux-prefs-state.ts",
  "packages/ui/components/settings/ux-prefs.runtime.test.ts",
  "services/api-nest/src/ux-prefs/user-ux-prefs.service.ts",
  "services/api-nest/src/ux-prefs/user-ux-prefs.user.controller.ts",
  "tooling/e2e/specs/settings-closure.spec.cjs",
]) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const page = read("apps/web/app/me/settings/page.tsx");
const client = read("apps/web/app/me/settings/SettingsClient.tsx");
const panel = read("packages/ui/components/settings/SettingsPanel.tsx");
const layout = read("apps/web/app/me/layout.tsx");
const spec = read("tooling/e2e/specs/settings-closure.spec.cjs");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");

if (!page.includes("SettingsClient")) fail("settings page must mount SettingsClient");
if (!client.includes("SettingsPanel")) fail("settings must keep prefs panel");
if (!client.includes("logoutAuth") || !client.includes("deleteAuthAccount")) {
  fail("settings must use logoutAuth + deleteAuthAccount owners");
}
if (!client.includes("unauthorized") || !client.includes("unavailable")) {
  fail("settings must distinguish unauthorized/unavailable");
}
if (!panel.includes("/api/v1/me/notification-prefs")) {
  fail("SettingsPanel must persist notification prefs");
}
if (!panel.includes("/api/v1/me/ux-prefs")) {
  fail("SettingsPanel must persist UX prefs to /api/v1/me/ux-prefs");
}
if (!panel.includes("data-ux-prefs-view") || !panel.includes("parseUserUxPrefs")) {
  fail("SettingsPanel must distinguish UX prefs loading/unauthorized/unavailable/ready");
}
if (!panel.includes("data-font-scale-confirmed") || !panel.includes("data-tone-band-authority")) {
  fail("SettingsPanel must not treat option presence as confirmed server prefs");
}
if (!panel.includes("disabled={!uxReady}") && !panel.includes("disabled={!uxReady")) {
  fail("SettingsPanel must disable UX controls until server ready");
}
const depositClient = read("apps/web/app/wallet/deposit/DepositClient.tsx");
if (!depositClient.includes("resolveDepositTab") || !depositClient.includes("data-deposit-tab-source")) {
  fail("DepositClient must resolve URL > stored pref > USDT");
}
if (depositClient.includes('searchParams.get("tab") === "krw" ? "krw" : "usdt"')) {
  fail("DepositClient must not hardcode absent tab as confirmed USDT pref");
}
const invite = read("apps/web/app/me/invite/InviteClient.tsx");
if (!invite.includes("/api/v1/me/ux-prefs") || !invite.includes("toneBand={toneBand}")) {
  fail("InviteClient must consume server toneBand — option presence is not enough");
}
const nestCtl = read("services/api-nest/src/ux-prefs/user-ux-prefs.user.controller.ts");
if (!nestCtl.includes("JwtAuthGuard") || !nestCtl.includes("parseUxPrefsPatch")) {
  fail("ux-prefs controller must be JWT-scoped and fail-closed");
}
if (nestCtl.includes("query.userId") || nestCtl.includes("body.userId")) {
  fail("ux-prefs must not take userId authority from query/body");
}
if (!panel.includes("setNotify(prev)")) {
  fail("SettingsPanel must revert prefs when PUT fails");
}
if (!panel.includes("parseNotificationPrefs") || !panel.includes("createPrefsWriteController")) {
  fail("SettingsPanel must parse prefs fail-closed and queue one in-flight PUT");
}
if (panel.includes("!== false")) {
  fail("SettingsPanel must not coerce missing prefs to true");
}
if (layout.includes("LegacyAppShell") || layout.includes("AppShellRoot")) {
  fail("me layout must not remount leftover 5-tab chrome");
}
if (!spec.includes("unauthorized") || !spec.includes("settings-panel")) {
  fail("committed spec must cover unauthorized/ready prefs");
}
if (!spec.includes("prefs-malformed") || !spec.includes("data-prefs-view")) {
  fail("committed spec must cover malformed prefs fail-closed");
}
if (!spec.includes("data-ux-prefs-view") || !spec.includes("data-font-scale-confirmed")) {
  fail("committed spec must require confirmed server UX prefs, not option presence");
}
if (!spec.includes("data-deposit-tab-source") || !spec.includes("depositPref")) {
  fail("committed spec must prove URL > stored pref > USDT");
}
if (!pkg.includes('"verify:settings-closure"')) fail("package.json missing verify:settings-closure");
if (!catalog.includes("settings-closure")) fail("CATALOG.md must list settings-closure");
if (!domain.includes("settings-closure.cjs")) fail("domain-by-path must trigger settings-closure");

const runtimeTest = spawnSync(
  process.execPath,
  [
    "--test",
    "--experimental-strip-types",
    "packages/ui/components/settings/notification-prefs.runtime.test.ts",
    "packages/ui/components/settings/ux-prefs.runtime.test.ts",
    "services/api-nest/src/ux-prefs/user-ux-prefs.runtime.test.ts",
  ],
  { cwd: root, encoding: "utf8", timeout: 30_000 },
);
process.stdout.write(runtimeTest.stdout || "");
process.stderr.write(runtimeTest.stderr || "");
if (runtimeTest.status !== 0) {
  fail("notification/ux prefs runtime tests failed");
}

function finish(extra) {
  if (fails.length) {
    console.error("[verify:settings-closure] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log(
    "[verify:settings-closure] PASS — prefs persist · logout/delete owners · leftover chrome 0" +
      (extra ? ` · ${extra}` : ""),
  );
}

if (
  process.env.SETTINGS_CLOSURE_STATIC_ONLY === "1" ||
  process.env.CI === "true" ||
  process.env.CI === "1"
) {
  finish(process.env.SETTINGS_CLOSURE_STATIC_ONLY === "1" ? "static-only" : "ci-static");
  process.exit(0);
}

const { ensureLocalWebRuntime } = require("../e2e/lib/local-web-runtime.cjs");

ensureLocalWebRuntime({ timeoutMs: 180000 })
  .then(async (web) => {
    const result = spawnSync(
      process.execPath,
      [
        path.join(root, "node_modules/@playwright/test/cli.js"),
        "test",
        "--config",
        "tooling/e2e/playwright.config.cjs",
        "settings-closure.spec.cjs",
      ],
      {
        cwd: root,
        encoding: "utf8",
        env: {
          ...process.env,
          PLAYWRIGHT_BASE_URL: web.baseUrl,
          NODE_OPTIONS: process.env.NODE_OPTIONS || "--max-old-space-size=1536",
        },
        timeout: 420000,
      },
    );
    await web.stop();
    process.stdout.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    if (result.status !== 0) fail("committed Playwright settings-closure runtime failed");
    finish("browser");
  })
  .catch((err) => {
    fail(err && err.message ? err.message : String(err));
    finish("browser");
  });
