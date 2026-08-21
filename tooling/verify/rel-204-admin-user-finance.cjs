/**
 * verify:rel-204-admin-user-finance — live buckets, no balance UPDATE UI
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const page = fs.readFileSync(
  path.join(root, "apps/admin/app/admin/users/[id]/finance/page.tsx"),
  "utf8",
);

for (const needle of [
  "tab=buckets",
  "finance-buckets-panel",
  "data-buckets-api",
  "/api/v1/admin/users/",
  "/buckets",
  "BucketBreakdown",
  "hidePracticeWhenZero={false}",
  "adminGet",
  "readAmount",
  'data-forbid="balance-update"',
]) {
  if (!page.includes(needle)) fails.push(`finance missing ${needle}`);
}
if (page.includes('principalUsdt="0"') || page.includes('profitUsdt="0"')) {
  fails.push("finance must not hardcode bucket zeros");
}
if (/balance-adjust|balanceAdjust|잔액 수정|직접 수정하기/.test(page) && /<form/.test(page) && /amountUsdt/.test(page)) {
  fails.push("finance must not ship a balance UPDATE form");
}
if (page.includes("/balance-adjust")) {
  fails.push("finance EXIT_GATE: balance-adjust UI forbidden");
}

if (fails.length) {
  console.error("[verify:rel-204-admin-user-finance] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-204-admin-user-finance] PASS");
