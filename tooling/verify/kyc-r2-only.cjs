/**
 * verify:kyc-r2-only — Money §42.2.1
 * bucket kyc-docs private · key pattern kyc/ · signed URL TTL cap · server code has no R2 public URL hardcoding
 * (customer web public-URL scan + T.kyc copy: putduk-web · quality/putduk-web-ui-assertions-handoff.md 1d)
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
    if (ent.name === "node_modules" || ent.name === "dist" || ent.name === "coverage") {
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

// compliance server code — no R2 *public* URL hardcoding. The S3 signing host
// (<account>.r2.cloudflarestorage.com) is the private server-side endpoint and stays allowed.
const ban =
  /(?:pub-[a-z0-9]+\.r2\.dev|https?:\/\/[^"'`\s]*kyc-docs[^"'`\s]*|R2_PUBLIC|publicUrl\s*[:=]\s*['"]https?:)/i;

walk(path.join(root, "services/api-nest/src/compliance"), (file) => {
  if (!/\.(ts|js|json)$/.test(file)) return;
  const t = fs.readFileSync(file, "utf8");
  if (ban.test(t)) {
    fails.push(
      `compliance R2 public URL hardcoding forbidden: ${path.relative(root, file)}`,
    );
  }
});

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
  "[verify:kyc-r2-only] PASS (private kyc-docs · key kyc/…enc · signed ≤5m · compliance public URL 0)",
);
