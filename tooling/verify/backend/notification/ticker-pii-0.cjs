/**
 * BACKEND-ONLY PORT of tooling/verify/ticker-pii-0.cjs (recovery base SHA 86f15964).
 * UI assertions (customer web / admin UI / shared UI package / client SDK) were recorded in
 * quality/putduk-web-ui-assertions-handoff.md and removed here; only backend
 * (services / schemas / supabase / workers / infra / governance) assertions remain.
 */
/**
 * verify:ticker-pii-0 — UI §33.2a · Admin §35.4 pointer
 * PublicTickerEvent fields only · no email/userId/kind · DayPulse merge 0
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../../../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const schemaPath = path.join(root, "schemas/public-ticker-event.v1.json");
if (!fs.existsSync(schemaPath)) {
  fails.push("missing schemas/public-ticker-event.v1.json");
} else {
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  const props = Object.keys(schema.properties || {});
  for (const need of ["id", "displayLabel", "amountKrwText", "templateKey", "at"]) {
    if (!props.includes(need)) fails.push(`schema missing property ${need}`);
  }
  for (const ban of ["email", "userId", "legalName", "kind", "displayName"]) {
    if (props.includes(ban)) fails.push(`schema must not expose ${ban}`);
  }
}

if (fails.length) {
  console.error("[verify:ticker-pii-0] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:ticker-pii-0] PASS (public-ticker-event.v1 PII 0)",
);
