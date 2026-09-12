/**
 * BACKEND-ONLY PORT of tooling/verify/share-copy.cjs (recovery base SHA 86f15964).
 * UI assertions (customer web / admin UI / shared UI package / client SDK) were recorded in
 * quality/putduk-web-ui-assertions-handoff.md and removed here; only backend
 * (services / schemas / supabase / workers / infra / governance) assertions remain.
 */
/**
 * verify:share-copy — Money §51.5 + UI §5.9.1a pointer
 * invite copy SSOT · no IT jargon · share spam ≠ invite cap · Canon wire
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../../../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const files = [
  "services/api-nest/src/referral/referral.share.service.ts",
  "services/api-nest/src/referral/referral.controller.ts",
];
for (const f of files) mustExist(f);

const share = read(
  "services/api-nest/src/referral/referral.share.service.ts",
);
for (const needle of [
  "sharePerUserPerDay",
  "spam only",
  "REFERRAL_SHARE_LIMIT",
  "not invite cap",
]) {
  if (!share.includes(needle)) {
    fails.push(`share.service missing: ${needle}`);
  }
}

const ctrl = read("services/api-nest/src/referral/referral.controller.ts");
if (!ctrl.includes("UI §5.9.1a")) {
  fails.push("referral.controller must pointer UI §5.9.1a");
}
if (!ctrl.includes("inviteCountUnlimited: true")) {
  fails.push("referral me payload must set inviteCountUnlimited");
}

if (fails.length) {
  console.error("[verify:share-copy] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:share-copy] PASS");
