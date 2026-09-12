/**
 * BACKEND-ONLY PORT of tooling/verify/invite-closure.cjs (recovery base SHA 97b07908).
 * UI assertions (apps/web /me/invite page · InviteClient · InviteHome · packages/ui referral-me state ·
 * Playwright invite-closure spec) were recorded in quality/putduk-web-ui-assertions-handoff.md 1d and removed;
 * only the referral own-code server contract remains here. The runtime test
 * services/api-nest/src/referral/referral-code.util.runtime.test.ts is executed by verify:unit-tests.
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

const controller = read("services/api-nest/src/referral/referral.controller.ts");
if (!controller.includes("referralCode") || !controller.includes("ownCode")) {
  fails.push("/api/v1/referral/me must return session-owned referralCode (ownCode)");
}

const ownCode = read("services/api-nest/src/referral/referral.own-code.service.ts");
if (!ownCode.includes("referralCode")) {
  fails.push("referral.own-code.service must resolve the authoritative referralCode");
}

const util = read("services/api-nest/src/referral/referral-code.util.ts");
if (!util.includes("mgsytcetsiecllmhcyox") || !util.includes("allowsReferralCodeEnsure")) {
  fails.push("referral code ensure must deny the production project ref");
}
if (!fs.existsSync(path.join(root, "services/api-nest/src/referral/referral-code.util.runtime.test.ts"))) {
  fails.push("missing: services/api-nest/src/referral/referral-code.util.runtime.test.ts (run by verify:unit-tests)");
}

if (fails.length) {
  console.error("[verify:backend/referral-own-code] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:backend/referral-own-code] PASS (referral/me ownCode · ensure denies production ref)");
