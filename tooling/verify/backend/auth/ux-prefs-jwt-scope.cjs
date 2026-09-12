/**
 * BACKEND-ONLY PORT of tooling/verify/settings-closure.cjs (recovery base SHA 97b07908 · REL-125).
 * UI assertions (apps/web /me/settings page · SettingsClient · SettingsPanel prefs persistence ·
 * DepositClient tab source · InviteClient toneBand · Playwright settings-closure spec) were recorded in
 * quality/putduk-web-ui-assertions-handoff.md 1d. The server-side prefs contract stays here; the ux-prefs
 * runtime test (services/api-nest/src/ux-prefs/user-ux-prefs.runtime.test.ts) is run by verify:unit-tests.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../../../..");
const fails = [];

function read(rel) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(fp, "utf8");
}

for (const f of [
  "services/api-nest/src/ux-prefs/user-ux-prefs.service.ts",
  "services/api-nest/src/ux-prefs/user-ux-prefs.user.controller.ts",
  "services/api-nest/src/ux-prefs/user-ux-prefs.runtime.test.ts",
]) {
  if (!fs.existsSync(path.join(root, f))) fails.push(`missing: ${f}`);
}

const nestCtl = read("services/api-nest/src/ux-prefs/user-ux-prefs.user.controller.ts");
if (!nestCtl.includes("JwtAuthGuard") || !nestCtl.includes("parseUxPrefsPatch")) {
  fails.push("ux-prefs controller must be JWT-scoped and fail-closed (parseUxPrefsPatch)");
}
if (nestCtl.includes("query.userId") || nestCtl.includes("body.userId")) {
  fails.push("ux-prefs must not take userId authority from query/body");
}

const inboxCtl = read("services/api-nest/src/inbox/inbox.user.controller.ts");
if (inboxCtl.includes("query.userId") || inboxCtl.includes("body.userId")) {
  fails.push("inbox/notification-prefs controller must not take userId authority from query/body");
}

if (fails.length) {
  console.error("[verify:backend/ux-prefs-jwt-scope] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:backend/ux-prefs-jwt-scope] PASS (ux-prefs JWT scope · fail-closed patch parse · userId authority = session)");
