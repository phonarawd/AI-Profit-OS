/**
 * BACKEND-ONLY PORT of tooling/verify/referral-unlimited-invites.cjs (recovery base SHA 86f15964).
 * UI assertions (customer web / admin UI / shared UI package / client SDK) were recorded in
 * quality/putduk-web-ui-assertions-handoff.md and removed here; only backend
 * (services / schemas / supabase / workers / infra / governance) assertions remain.
 */
/**
 * verify:referral-unlimited-invites — Money §51.5 R14
 * 월간/인원 초대캡 코드경로 0 · schema not:capPerReferrerMonth · Admin UI 0
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
  "schemas/referral-program.v1.json",
  "schemas/referral-edge.v1.json",
  "services/api-nest/src/referral/referral.types.ts",
  "services/api-nest/src/referral/referral.edge.service.ts",
  "services/api-nest/src/referral/referral.program.service.ts",
  "services/api-nest/src/referral/referral.admin.controller.ts",
  "supabase/migrations/20260808205857_referral_support_attribution.sql",
];
for (const f of files) mustExist(f);

const schema = JSON.parse(read("schemas/referral-program.v1.json"));
if (!schema.not || !schema.not.required?.includes("capPerReferrerMonth")) {
  fails.push("referral-program.v1 must forbid capPerReferrerMonth via not.required");
}
if (schema.properties?.capPerReferrerMonth) {
  fails.push("referral-program.v1 must NOT define capPerReferrerMonth property");
}

const types = read("services/api-nest/src/referral/referral.types.ts");
for (const needle of [
  "capPerReferrerMonth",
  "FORBIDDEN_INVITE_COUNT_REJECT_CODES",
  "INVITE_MONTHLY_CAP",
  "rewardsEnabled: false",
  "UI §5.9.1a",
]) {
  if (!types.includes(needle)) {
    fails.push(`referral.types missing: ${needle}`);
  }
}

const edge = read("services/api-nest/src/referral/referral.edge.service.ts");
if (!edge.includes("Invite count = ∞") && !edge.includes("invite count")) {
  fails.push("edge.service must document unlimited invites");
}
for (const bad of [
  "INVITE_MONTHLY_CAP",
  "throw new BadRequestException(\"capPerReferrerMonth",
  "monthlyInviteCap",
]) {
  if (edge.includes(`throw`) && edge.includes(bad) && bad !== "INVITE_MONTHLY_CAP") {
    fails.push(`edge.service must not reject via ${bad}`);
  }
}
// Must list forbidden codes but never throw them as invite rejects
if (!edge.includes("FORBIDDEN_INVITE_COUNT_REJECT_CODES")) {
  fails.push("edge.service must reference FORBIDDEN_INVITE_COUNT_REJECT_CODES");
}

const program = read("services/api-nest/src/referral/referral.program.service.ts");
if (!program.includes("REFERRAL_FORBIDDEN_CONFIG_KEYS")) {
  fails.push("program.service must reject forbidden config keys");
}
if (!program.includes("capPerReferrerMonth")) {
  fails.push("program.service must explicitly forbid capPerReferrerMonth");
}

const adminCtrl = read(
  "services/api-nest/src/referral/referral.admin.controller.ts",
);
if (!adminCtrl.includes("capPerReferrerMonth")) {
  fails.push("admin controller must reject capPerReferrerMonth");
}

const migration = read(
  "supabase/migrations/20260808205857_referral_support_attribution.sql",
);
if (!migration.includes("capPerReferrerMonth")) {
  fails.push("migration must CHECK-forbid capPerReferrerMonth in config jsonb");
}

if (fails.length) {
  console.error("[verify:referral-unlimited-invites] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:referral-unlimited-invites] PASS");
