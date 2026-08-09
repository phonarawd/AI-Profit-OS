/**
 * verify:kyc-surfaces — UI §6.4d PART6a · Money §42 pointer
 * Canon kyc-guide / kyc-doc-capture / kyc-confirm · Lux 3면 · RRN type-in 0
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
  "packages/ui/canon/surfaces/kyc-guide.wire.json",
  "packages/ui/canon/surfaces/kyc-doc-capture.wire.json",
  "packages/ui/canon/surfaces/kyc-confirm.wire.json",
  "packages/ui/copy/ko/kyc.ts",
  "packages/ui/components/kyc/KycFlow.tsx",
  "packages/ui/components/kyc/index.ts",
  "apps/web/app/me/kyc/page.tsx",
];
for (const f of files) mustExist(f);

for (const wireRel of [
  "packages/ui/canon/surfaces/kyc-guide.wire.json",
  "packages/ui/canon/surfaces/kyc-doc-capture.wire.json",
  "packages/ui/canon/surfaces/kyc-confirm.wire.json",
]) {
  const raw = read(wireRel);
  if (!raw) continue;
  let wire;
  try {
    wire = JSON.parse(raw);
  } catch {
    fails.push(`${wireRel} invalid JSON`);
    continue;
  }
  if (wire.route !== "/me/kyc") {
    fails.push(`${wireRel} route must be /me/kyc`);
  }
  if (!(wire.forbidden || []).includes("rrn_type_in")) {
    fails.push(`${wireRel} must forbid rrn_type_in`);
  }
  if (!(wire.forbidden || []).includes("gender_field") && !(wire.forbidden || []).includes("gender_branch")) {
    fails.push(`${wireRel} must forbid gender_field or gender_branch`);
  }
}

const flow = read("packages/ui/components/kyc/KycFlow.tsx");
for (const needle of [
  'data-testid="kyc-flow"',
  'data-kyc-step=',
  '"guide"',
  '"doc"',
  '"confirm"',
  "kr_id",
  "driver",
  "passport",
  "T.kyc.start",
  "T.kyc.submit",
  "T.kyc.legalName",
  "T.kyc.retake",
]) {
  if (!flow.includes(needle)) {
    fails.push(`KycFlow missing: ${needle}`);
  }
}
if (/rrn|주민등록번호|주민번호|name=["']rrn/i.test(flow)) {
  fails.push("KycFlow must not include RRN type-in fields");
}
if (/name=["']gender["']|성별/.test(flow)) {
  fails.push("KycFlow must not include gender field");
}
if (/r2\.dev|publicUrl|kyc-docs\//i.test(flow)) {
  fails.push("KycFlow must not hardcode public R2 URLs");
}

const page = read("apps/web/app/me/kyc/page.tsx");
if (!page.includes("KycFlow")) {
  fails.push("/me/kyc must render KycFlow");
}
if (/rrn|주민등록번호|주민번호/i.test(page)) {
  fails.push("/me/kyc page must not include RRN type-in");
}

const copy = read("packages/ui/copy/ko/kyc.ts");
for (const key of [
  "pageTitle",
  "whyOnce",
  "storagePlain",
  "steps123",
  "start",
  "docTypeKrId",
  "docTypeDriver",
  "docTypePassport",
  "submit",
  "legalName",
]) {
  if (!copy.includes(`${key}:`)) fails.push(`kyc.ts missing ${key}`);
}

const pkg = read("packages/ui/package.json");
if (!pkg.includes('"./components/kyc"')) {
  fails.push("package.json must export ./components/kyc");
}

const manifest = read("packages/ui/canon/manifest.json");
for (const id of ["kyc-guide", "kyc-doc-capture", "kyc-confirm"]) {
  if (!manifest.includes(`"id": "${id}"`)) {
    fails.push(`canon manifest missing ${id}`);
  }
}

if (fails.length) {
  console.error("[verify:kyc-surfaces] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:kyc-surfaces] PASS (Canon 3면 · KycFlow · RRN0 · gender0 · public R2 0)",
);
