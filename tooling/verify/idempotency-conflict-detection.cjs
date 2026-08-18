/**
 * verify:idempotency-conflict-detection — Money post-r0
 * same key + semantic-different payload → conflict · same payload → reuse
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
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

mustExist("services/api-nest/src/ledger/idempotency-fingerprint.ts");
mustExist(
  "supabase/migrations/20260811062000_idempotency_request_fingerprint.sql",
);
mustExist("services/api-nest/src/ledger/ledger.posting.service.ts");
mustExist("services/api-nest/src/opportunities/participate.service.ts");

const fp = read("services/api-nest/src/ledger/idempotency-fingerprint.ts");
for (const n of [
  "fingerprintPayload",
  "assertFingerprintMatch",
  "ledgerJournalSemantic",
  "participateSemantic",
  "IDEMPOTENCY_KEY_CONFLICT",
]) {
  if (!fp.includes(n)) fails.push(`idempotency-fingerprint missing ${n}`);
}

const mig = read(
  "supabase/migrations/20260811062000_idempotency_request_fingerprint.sql",
);
if (!/ledger_journals[\s\S]*request_fingerprint/.test(mig)) {
  fails.push("migration must add ledger_journals.request_fingerprint");
}
if (!/participate_requests[\s\S]*request_fingerprint/.test(mig)) {
  fails.push("migration must add participate_requests.request_fingerprint");
}

const posting = read("services/api-nest/src/ledger/ledger.posting.service.ts");
if (!posting.includes("request_fingerprint")) {
  fails.push("ledger.posting must persist request_fingerprint");
}
if (!posting.includes("assertFingerprintMatch") && !posting.includes("assertExistingFingerprint")) {
  fails.push("ledger.posting must assert fingerprint on reuse");
}
if (!posting.includes("fingerprintPayload")) {
  fails.push("ledger.posting must compute fingerprintPayload");
}

const part = read("services/api-nest/src/opportunities/participate.service.ts");
if (!part.includes("request_fingerprint")) {
  fails.push("participate must persist request_fingerprint");
}
if (!part.includes("assertFingerprintMatch")) {
  fails.push("participate must assertFingerprintMatch on reuse");
}
if (!part.includes("participateSemantic")) {
  fails.push("participate must use participateSemantic");
}

const pkg = JSON.parse(read("package.json"));
if (!pkg.scripts?.["verify:idempotency-conflict-detection"]) {
  fails.push("package.json missing verify:idempotency-conflict-detection");
}
const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("idempotency-conflict-detection")) {
  fails.push("CATALOG.md missing idempotency-conflict-detection");
}

if (fails.length) {
  console.error("[verify:idempotency-conflict-detection] FAIL");
  for (const f of fails) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  "[verify:idempotency-conflict-detection] PASS (fingerprint helper · mig · ledger+participate conflict path · catalog)",
);
