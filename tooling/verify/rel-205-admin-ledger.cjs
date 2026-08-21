/**
 * verify:rel-205-admin-ledger — journal/recon/shadow read
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const page = fs.readFileSync(
  path.join(root, "apps/admin/app/admin/ledger/page.tsx"),
  "utf8",
);

for (const needle of [
  "/api/v1/admin/ledger/journals",
  "/api/v1/admin/ledger/recon",
  "/api/v1/admin/shadow-replay/latest",
  '"shadow-replay"',
  'data-max-drift="0"',
  "adminGet",
]) {
  if (!page.includes(needle)) fails.push(`ledger missing ${needle}`);
}
if (page.includes("balance-adjust") || page.includes("<textarea") && page.includes("journalType")) {
  fails.push("ledger must stay read-only for journals");
}

if (fails.length) {
  console.error("[verify:rel-205-admin-ledger] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-205-admin-ledger] PASS");
