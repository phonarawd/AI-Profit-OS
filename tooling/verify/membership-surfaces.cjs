/**
 * verify:membership-surfaces — UI §5.9.2c · §51.18a
 * Canon membership-home · 100%보장0 · 고액희소 · Admin §9.8.10 pointer
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const files = [
  "packages/ui/copy/ko/membership.ts",
  "packages/ui/canon/surfaces/membership-home.wire.json",
  "packages/ui/components/membership/MembershipHome.tsx",
  "packages/ui/components/membership/MembershipBadge.tsx",
  "packages/ui/components/membership/index.ts",
  "apps/web/app/me/membership/page.tsx",
  "services/api-nest/src/membership/membership.user.controller.ts",
];
for (const f of files) mustExist(f);

const copy = read("packages/ui/copy/ko/membership.ts");
for (const key of [
  "title:",
  "fulfillRateLabel:",
  "notGuaranteed:",
  "highScarce:",
  "aiUnlock",
  "ladder:",
  "faq:",
  "enginePointer:",
  "adminPointer:",
]) {
  if (copy && !copy.includes(key)) fails.push(`membership.ts missing ${key}`);
}
if (copy && !copy.includes("요즘 조건이 맞은 비율")) {
  fails.push("membership.ts must use fulfillRateLabel 요즘 조건이 맞은 비율");
}
if (copy && !copy.includes("매번 맞는 건 아니에요")) {
  fails.push("membership.ts missing notGuaranteed copy");
}
if (copy && !copy.includes("Admin §9.8.10")) {
  fails.push("membership.ts must keep Admin §9.8.10 pointer");
}

const copyNoComments = copy
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "")
  // Engine aiPerkFlags key map (flag ids may contain vip_desk_*) — strip before scan
  .replace(/aiUnlock:\s*\{[\s\S]*?\},/, "");
for (const bad of [
  /100%\s*보장/,
  /successRatePercent/,
  /매칭\s*100%\s*보장/,
  /당첨\s*확정/,
  /무조건\s*당첨/,
]) {
  if (bad.test(copyNoComments)) {
    fails.push(`membership.ts forbidden: ${bad}`);
  }
}
// 「당첨률」부정 안내만 허용 · 긍정 당첨 카피 금지
if (/당첨/.test(copyNoComments) && !/당첨률이 아니|당첨률인가요/.test(copyNoComments)) {
  fails.push("membership.ts: 당첨 copy only allowed as negation (참고≠당첨)");
}

const wire = JSON.parse(
  read("packages/ui/canon/surfaces/membership-home.wire.json") || "{}",
);
if (wire.id !== "membership-home" || wire.route !== "/me/membership") {
  fails.push("membership-home.wire id/route mismatch");
}
const blockIds = (wire.blocks || []).map((b) => b.id);
for (const id of [
  "title",
  "currentBadge",
  "nextHint",
  "fulfillRate",
  "aiUnlocks",
  "notGuaranteed",
  "highScarce",
  "ladder",
  "faq",
]) {
  if (!blockIds.includes(id)) fails.push(`membership-home.wire missing block ${id}`);
}
for (const f of [
  "guaranteed_match_100",
  "lottery_win_copy",
  "fulfillRate_as_rule_input",
  "photo_pixel_match",
  "IT_jargon",
]) {
  if (!(wire.forbidden || []).includes(f)) {
    fails.push(`membership-home.wire must forbid ${f}`);
  }
}

const home = read("packages/ui/components/membership/MembershipHome.tsx");
for (const needle of [
  'data-testid="membership-home"',
  'data-canon="membership-home"',
  'data-fulfill-rate-rule-input="false"',
  'data-admin-pointer=',
  'data-engine-pointer=',
  "MembershipBadge",
  "T.membership",
  "notGuaranteed",
  "highScarce",
]) {
  if (home && !home.includes(needle)) {
    fails.push(`MembershipHome missing: ${needle}`);
  }
}
if (home && /100%\s*보장|당첨\s*률|successRatePercent/.test(home)) {
  fails.push("MembershipHome must not claim 100% / lottery");
}

const page = read("apps/web/app/me/membership/page.tsx");
if (page && !page.includes("MembershipHome")) {
  fails.push("/me/membership must render MembershipHome");
}
if (page && !page.includes("/api/v1/me/membership")) {
  fails.push("/me/membership must fetch GET /me/membership");
}

const idx = read("packages/ui/copy/ko/index.ts");
if (idx && !idx.includes('from "./membership"') && !idx.includes("from './membership'")) {
  fails.push("copy/ko/index.ts must import membership");
}

const pkg = read("packages/ui/package.json");
if (pkg && !pkg.includes('"./components/membership"')) {
  fails.push("package.json must export ./components/membership");
}

const manifest = read("packages/ui/canon/manifest.json");
if (manifest && !manifest.includes('"id": "membership-home"')) {
  fails.push("canon manifest missing membership-home");
}

const rootPkg = read("package.json");
if (rootPkg && !rootPkg.includes('"verify:membership-surfaces"')) {
  fails.push("root package.json must define verify:membership-surfaces");
}

if (fails.length) {
  console.error("[verify:membership-surfaces] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:membership-surfaces] PASS (membership-home · 100%0 · Admin pointer)",
);
