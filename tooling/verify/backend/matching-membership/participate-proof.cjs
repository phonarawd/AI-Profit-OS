/**
 * BACKEND-ONLY PORT of tooling/verify/participate-proof.cjs (recovery base SHA 86f15964).
 * UI assertions (customer web / admin UI / shared UI package / client SDK) were recorded in
 * quality/putduk-web-ui-assertions-handoff.md and removed here; only backend
 * (services / schemas / supabase / workers / infra / governance) assertions remain.
 */
/**
 * verify:participate-proof — UI §51.16 PART8b
 * every participate stores proof · success/safe_stop UI shows match
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../../../..");
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
  "schemas/participate-proof.v1.json",
  "services/api-nest/src/opportunities/participate.service.ts",
];
for (const f of files) mustExist(f);

const schema = JSON.parse(read("schemas/participate-proof.v1.json") || "{}");
for (const req of [
  "tradeId",
  "pricingVersion",
  "buyPriceUsdt",
  "sellPriceUsdt",
  "expectedProfitUsdt",
  "fxSnapshotId",
  "proofHash",
  "capturedAt",
]) {
  if (!(schema.required || []).includes(req)) {
    fails.push(`participate-proof schema missing required ${req}`);
  }
}

const svc = read(
  "services/api-nest/src/opportunities/participate.service.ts",
);
for (const needle of [
  "buildParticipateProof",
  "proofHash",
  "createHash",
  "participateProof",
  "sha256",
]) {
  if (!svc.includes(needle)) {
    fails.push(`participate.service must store proof (${needle})`);
  }
}

if (fails.length) {
  console.error("[verify:participate-proof] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:participate-proof] PASS (participate-proof.v1 required · participate.service sha256 proof)",
);
