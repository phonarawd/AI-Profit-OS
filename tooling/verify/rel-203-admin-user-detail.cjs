/**
 * verify:rel-203-admin-user-detail — live membership/risk/overrides
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const page = fs.readFileSync(
  path.join(root, "apps/admin/app/admin/users/[id]/page.tsx"),
  "utf8",
);

for (const needle of [
  "/api/v1/admin/users/${userId}/membership",
  "/api/v1/admin/risk/users/${userId}/state",
  "/api/v1/admin/users/${userId}/opportunity-overrides",
  "adminGet",
  'data-tab="membership"',
  'data-surface="user-membership"',
  "user-opportunity-override",
  "ledger-immutable",
]) {
  if (!page.includes(needle)) fails.push(`user detail missing ${needle}`);
}

if (fails.length) {
  console.error("[verify:rel-203-admin-user-detail] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-203-admin-user-detail] PASS");
