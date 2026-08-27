/**
 * verify:settings-closure — /me/settings
 * Static contract: fail-closed prefs, serialized writes, logout/delete guards.
 * CI/SETTINGS_CLOSURE_STATIC_ONLY = static-only. Not browser evidence.
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
  "tooling/e2e/specs/settings-closure.spec.cjs",
  "tooling/e2e/lib/account-route-stubs.cjs",
]) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const page = read("apps/web/app/me/settings/page.tsx");
const client = read("apps/web/app/me/settings/SettingsClient.tsx");
const panel = read("packages/ui/components/settings/SettingsPanel.tsx");
const layout = read("apps/web/app/me/layout.tsx");
const spec = read("tooling/e2e/specs/settings-closure.spec.cjs");
const stubs = read("tooling/e2e/lib/account-route-stubs.cjs");
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
if (!client.includes("err.status === 403") && !client.includes("status === 403")) {
  fail("settings session 403 must map to unauthorized");
}
if (!client.includes("logoutInFlightRef") || !client.includes("useRef")) {
  fail("logout must use a synchronous in-flight guard");
}
if (!/if \(logoutInFlightRef\.current\) return/.test(client)) {
  fail("logout must refuse a second in-flight POST");
}
if (!client.includes("deleteInFlightRef")) {
  fail("delete must use a synchronous in-flight guard");
}
if (!/if \(deleteInFlightRef\.current\) return/.test(client)) {
  fail("delete must refuse a second in-flight POST");
}
if (!client.includes("DELETE_ACCOUNT_CONFIRM_PHRASE")) {
  fail("delete must keep the exact confirm phrase");
}
if (!/phrase !== DELETE_ACCOUNT_CONFIRM_PHRASE/.test(client)) {
  fail("delete must refuse the wrong phrase before POST");
}
if (!/confirmAgain !== true/.test(client)) {
  fail("delete must refuse an unchecked confirm before POST");
}
if (!client.includes("disabled={logoutBusy}") || !client.includes("disabled={deleteBusy}")) {
  fail("logout/delete must disable controls while submitting");
}
if (!panel.includes("/api/v1/me/notification-prefs")) {
  fail("SettingsPanel must persist notification prefs");
}
if (!panel.includes('credentials: "include"')) {
  fail("SettingsPanel must keep credentials include");
}
if (!panel.includes('typeof value !== "boolean"') && !panel.includes('typeof rec[key] !== "boolean"')) {
  fail("SettingsPanel must parse prefs with typeof === boolean");
}
if (/\w+ !== false/.test(panel) || /json\.\w+ !== false/.test(panel)) {
  fail("SettingsPanel must not use json.field !== false fail-open parsing");
}
if (!panel.includes('PrefsView') && !panel.includes('"loading"')) {
  fail("SettingsPanel must keep an explicit prefs view state");
}
if (!panel.includes('"ready"') || !panel.includes('"unavailable"')) {
  fail("SettingsPanel must keep prefs ready/unavailable");
}
if (!panel.includes("prefsWriteState") || !panel.includes("inFlight")) {
  fail("prefs writes must serialize with one in-flight PUT plus latest queue");
}
if (!panel.includes("confirmed") || !panel.includes("queued")) {
  fail("prefs writes must keep last confirmed authoritative prefs and a latest queue");
}
if (!panel.includes("JSON.stringify(sending)") && !panel.includes("JSON.stringify(next)")) {
  fail("each PUT must send a complete prefs object");
}
if (layout.includes("LegacyAppShell") || layout.includes("AppShellRoot")) {
  fail("me layout must not remount leftover 5-tab chrome");
}
if (!spec.includes("unauthorized") || !spec.includes("settings-panel")) {
  fail("committed spec must cover unauthorized/ready prefs");
}
for (const needle of [
  "unauthorized403",
  "prefsStatus: 401",
  "prefsStatus: 403",
  "prefsStatus: 500",
  "prefsNetworkFail",
  "empty-object",
  "null-body",
  "missing-master",
  "null-field",
  "string-true",
  "number-one",
  "object-field",
  "array-field",
  "single toggle",
  "true-false-true",
  "A then B",
  "PUT failure",
  "logout rapid double-click",
  "delete unchecked",
  "wrong phrase",
  "whitespace-only",
  "delete rapid double-click",
  "settings responsive",
  "390",
  "768",
  "1024",
  "1440",
  "wcag2aa",
  "unlabeled controls",
]) {
  if (!spec.includes(needle)) {
    fail(`committed spec must cover ${needle}`);
  }
}
if (!stubs.includes("prefsPutCount") || !stubs.includes("logoutCount") || !stubs.includes("deleteCount")) {
  fail("account-route-stubs must capture prefs PUT / logout / delete counts");
}
if (!pkg.includes('"verify:settings-closure"')) fail("package.json missing verify:settings-closure");
if (!catalog.includes("settings-closure")) fail("CATALOG.md must list settings-closure");
if (!domain.includes("settings-closure.cjs")) fail("domain-by-path must trigger settings-closure");

function finish(extra) {
  if (fails.length) {
    console.error("[verify:settings-closure] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log(
    "[verify:settings-closure] PASS — prefs fail-closed · logout/delete guards · leftover chrome 0" +
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
