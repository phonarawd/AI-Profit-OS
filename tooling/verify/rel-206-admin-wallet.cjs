/**
 * verify:rel-206-admin-wallet — deposit-config / krw / disputes
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const page = fs.readFileSync(
  path.join(root, "apps/admin/app/admin/wallet/page.tsx"),
  "utf8",
);

for (const needle of [
  'tab=disputes',
  'data-testid="wallet-disputes-panel"',
  "/api/v1/admin/wallet/deposit-disputes",
  "credit",
  "reject",
  'data-audit-required="true"',
  "/api/v1/admin/wallet/deposit-config",
  "/api/v1/admin/wallet/krw-deposit-requests",
  "adminGet",
]) {
  if (!page.includes(needle)) fails.push(`wallet missing ${needle}`);
}
if (page.includes("tronGridApiKey") || page.includes("hotWalletXpubRef")) {
  fails.push("wallet must not render secrets");
}

if (fails.length) {
  console.error("[verify:rel-206-admin-wallet] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-206-admin-wallet] PASS");
