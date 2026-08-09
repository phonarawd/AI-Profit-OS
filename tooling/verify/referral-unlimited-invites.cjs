/**
 * verify:referral-unlimited-invites — Money §51.5 R14
 * 월간/인원 초대캡 코드경로 0 · schema not:capPerReferrerMonth · Admin UI 0
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
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
  "apps/admin/app/admin/growth/page.tsx",
  "packages/ui/copy/ko/invite.ts",
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

const growth = read("apps/admin/app/admin/growth/page.tsx");
for (const needle of [
  'tab=referral',
  'data-invite-cap-ui="0"',
  'data-forbid-monthly-invite-cap="true"',
  "growth?tab=referral",
  "rewardsEnabled",
]) {
  if (!growth.includes(needle)) {
    fails.push(`admin growth referral panel missing: ${needle}`);
  }
}
if (
  growth.includes("capPerReferrerMonth") &&
  !growth.includes("FORBIDDEN") &&
  !growth.includes("forbid")
) {
  fails.push("admin growth must not expose monthly invite cap input");
}
if (/월\s*\d+\s*명|명까지\s*초대|월간\s*초대\s*제한/.test(growth)) {
  fails.push("admin growth must not show monthly invite quota UI copy");
}

const inviteCopy = read("packages/ui/copy/ko/invite.ts");
if (!inviteCopy.includes("제한은 없어요") && !inviteCopy.includes("제한 없어요")) {
  fails.push("invite copy must state unlimited invites");
}
// Scan exported copy values only (comments may list FORBIDDEN phrases)
const inviteValues = inviteCopy
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");
// Allow FAQ Q "몇 명까지…" (answered 제한 없어요) · ban hard caps only
if (/최대\s*\d+\s*명|월\s*\d+\s*명|명까지만/.test(inviteValues)) {
  fails.push("invite copy must not mention invite count caps");
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
