/**
 * verify:invite-explain-surfaces — UI §5.9.1a PART7a
 * KR 20~70 설명 · noCap · toneBand · Canon invite-home · Money §51.5 pointer
 * 월간초대캡 카피 0 · L1/L2/L3·promo pool 영문 0
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
  "packages/ui/copy/ko/invite.ts",
  "packages/ui/canon/surfaces/invite-home.wire.json",
  "packages/ui/components/invite/InviteHome.tsx",
  "packages/ui/components/invite/index.ts",
  "apps/web/app/me/invite/page.tsx",
];
for (const f of files) mustExist(f);

const copy = read("packages/ui/copy/ko/invite.ts");
for (const key of [
  "title:",
  "oneLiner:",
  "steps3:",
  "whenMoney:",
  "practiceNote:",
  "noCap:",
  "shareLimitNote:",
  "holdNote:",
  "poolWaitNote:",
  "abuseNote:",
  "ctaShare:",
  "ctaCode:",
  "moneyPointer:",
  "faq:",
  "young:",
  "mid:",
  "senior:",
]) {
  if (!copy.includes(key)) fails.push(`invite.ts missing ${key}`);
}
if (!copy.includes("제한은 없어요") && !copy.includes("제한 없어요")) {
  fails.push("invite.ts must state unlimited invites (noCap)");
}
if (!copy.includes("Money §51.5")) {
  fails.push("invite.ts must keep Money §51.5 pointer");
}

const copyNoComments = copy
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");
for (const bad of [
  /명까지만/,
  /최대\s*\d+\s*명/,
  /월\s*\d+\s*명/,
  /\bL1\b/,
  /\bL2\b/,
  /\bL3\b/,
  /promo\s*pool/i,
  /다단계/,
  /피라미드/,
  /보장\s*수익/,
]) {
  if (bad.test(copyNoComments)) {
    fails.push(`invite.ts forbidden phrase: ${bad}`);
  }
}

const wire = JSON.parse(read("packages/ui/canon/surfaces/invite-home.wire.json"));
if (wire.id !== "invite-home" || wire.route !== "/me/invite") {
  fails.push("invite-home.wire id/route mismatch");
}
const blockIds = (wire.blocks || []).map((b) => b.id);
for (const id of [
  "title",
  "oneLiner",
  "steps3",
  "whenMoney",
  "practiceNote",
  "noCap",
  "shareLimitNote",
  "holdNote",
  "poolWaitNote",
  "abuseNote",
  "ctaShare",
  "ctaCode",
  "faq",
]) {
  if (!blockIds.includes(id)) fails.push(`invite-home.wire missing block ${id}`);
}
for (const f of [
  "invite_count_cap_copy",
  "mlm_pyramid_copy",
  "L1_L2_L3_english_labels",
  "gender_branch",
]) {
  if (!(wire.forbidden || []).includes(f)) {
    fails.push(`invite-home.wire must forbid ${f}`);
  }
}

const home = read("packages/ui/components/invite/InviteHome.tsx");
for (const needle of [
  'data-testid="invite-home"',
  'data-canon="invite-home"',
  'data-tone-band=',
  "T.invite",
  "young",
  "mid",
  "senior",
  "data-canon-block=\"noCap\"",
  "data-canon-block=\"steps3\"",
  "data-canon-block=\"whenMoney\"",
  "data-canon-block=\"faq\"",
  "data-canon-block=\"ctaShare\"",
  "data-money-pointer",
  "peotteok_tone_band",
  "peotteok_invite_explain_seen",
  "invite-explain",
]) {
  if (!home.includes(needle)) {
    fails.push(`InviteHome missing: ${needle}`);
  }
}
if (/명까지만|월간\s*초대\s*캡|capPerReferrerMonth/.test(home)) {
  fails.push("InviteHome must not render invite count cap UI");
}

const page = read("apps/web/app/me/invite/page.tsx");
if (!page.includes("InviteHome")) {
  fails.push("/me/invite must render InviteHome");
}

const pkg = read("packages/ui/package.json");
if (!pkg.includes('"./components/invite"')) {
  fails.push("package.json must export ./components/invite");
}

const manifest = read("packages/ui/canon/manifest.json");
if (!manifest.includes('"id": "invite-home"')) {
  fails.push("canon manifest missing invite-home");
}

const rootPkg = read("package.json");
if (!rootPkg.includes('"verify:invite-explain-surfaces"')) {
  fails.push("root package.json must define verify:invite-explain-surfaces");
}

const idx = read("packages/ui/copy/ko/index.ts");
if (!idx.includes('from "./invite"') && !idx.includes("from './invite'")) {
  fails.push("copy/ko/index.ts must import invite");
}

if (fails.length) {
  console.error("[verify:invite-explain-surfaces] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:invite-explain-surfaces] PASS (Canon invite-home · toneBand · noCap · §51.5 pointer)",
);
