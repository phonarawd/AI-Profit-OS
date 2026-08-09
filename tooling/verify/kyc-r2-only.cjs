/**
 * verify:kyc-r2-only — Money §42.2.1
 * apps/web: R2 public URL hardcoding 0 · bucket kyc-docs private · key pattern kyc/
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

function walk(dir, onFile) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      ent.name === "node_modules" ||
      ent.name === ".next" ||
      ent.name === "dist" ||
      ent.name === "coverage"
    ) {
      continue;
    }
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, onFile);
    else onFile(p);
  }
}

mustExist("infra/r2/kyc-docs.toml");
mustExist("services/api-nest/src/compliance/kyc-r2.service.ts");
mustExist("schemas/kyc-submission.v1.json");

const toml = read("infra/r2/kyc-docs.toml");
if (!toml.includes('bucket_name = "kyc-docs"')) {
  fails.push('kyc-docs.toml must lock bucket_name = "kyc-docs"');
}
if (!/public_access\s*=\s*false/.test(toml)) {
  fails.push("kyc-docs.toml must set public_access = false");
}

const r2 = read("services/api-nest/src/compliance/kyc-r2.service.ts");
for (const needle of [
  "kyc-docs",
  "kyc/",
  ".enc",
  "KYC_SIGNED_URL_TTL_SEC",
  "signedGetUrl",
  "assertPrivateKey",
  "public URL forbidden",
]) {
  if (!r2.includes(needle)) {
    fails.push(`kyc-r2.service missing: ${needle}`);
  }
}
if (!/Math\.min\(/.test(r2) || !r2.includes("KYC_SIGNED_URL_TTL_SEC")) {
  fails.push("signed URL must cap TTL at KYC_SIGNED_URL_TTL_SEC");
}

const types = read("services/api-nest/src/compliance/compliance.types.ts");
if (!types.includes("KYC_SIGNED_URL_TTL_SEC = 300")) {
  fails.push("KYC_SIGNED_URL_TTL_SEC must be 300 (≤5m)");
}

const schema = read("schemas/kyc-submission.v1.json");
if (!schema.includes('"pattern": "^kyc/"')) {
  fails.push("idDocR2Key must pattern ^kyc/");
}
if (schema.includes("publicUrl") && !schema.includes('"publicUrl"')) {
  /* ok if only in not.anyOf */
}
if (!/"publicUrl"/.test(schema)) {
  fails.push("schema must explicitly ban publicUrl");
}

// apps/web — no R2 public URL hardcoding
const ban =
  /(?:pub-[a-z0-9]+\.r2\.dev|r2\.cloudflarestorage\.com|https?:\/\/[^"'`\s]*kyc-docs[^"'`\s]*|R2_PUBLIC|publicUrl\s*[:=]\s*['"]https?:)/i;

const webRoot = path.join(root, "apps/web");
walk(webRoot, (file) => {
  if (!/\.(ts|tsx|js|jsx|css|json|md)$/.test(file)) return;
  const t = fs.readFileSync(file, "utf8");
  if (ban.test(t)) {
    fails.push(
      `apps/web R2 public URL hardcoding forbidden: ${path.relative(root, file)}`,
    );
  }
});

// copy must not instruct public R2
const copy = read("packages/ui/copy/ko/kyc.ts");
if (/r2\.dev|cloudflarestorage|publicUrl/i.test(copy)) {
  fails.push("T.kyc copy must not mention public R2 URLs");
}

const envEx = read(".env.example");
if (!envEx.includes("R2_KYC_BUCKET=kyc-docs")) {
  fails.push(".env.example must lock R2_KYC_BUCKET=kyc-docs");
}

if (fails.length) {
  console.error("[verify:kyc-r2-only] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:kyc-r2-only] PASS (private kyc-docs · key kyc/…enc · signed ≤5m · web public URL 0)",
);
