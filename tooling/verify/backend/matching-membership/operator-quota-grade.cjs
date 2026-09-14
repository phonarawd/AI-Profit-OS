/**
 * B2–B6 operator quota/grade 격리 러너.
 * 실 AdminGuard HTTP·실 Postgres 아님.
 */
"use strict";

const { spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "../../../..");
const files = [
  "services/api-nest/src/membership/member-daily-cap.isolation.cjs",
  "services/api-nest/src/membership/member-daily-cap.http.cjs",
  "services/api-nest/src/membership/operator-quota-grade.isolation.cjs",
  "services/api-nest/src/membership/operator-quota-grade.admin-http.cjs",
  "services/api-nest/src/membership/admin-member-directory.isolation.cjs",
  "services/api-nest/src/membership/admin-member-directory.admin-http.cjs",
  "services/api-nest/admin-staff-login.isolation.cjs",
  "services/api-nest/src/common/admin-session-login.admin-http.cjs",
  "services/api-nest/src/opportunities/operator-mall-product.isolation.cjs",
  "services/api-nest/src/opportunities/operator-mall-product.persist.isolation.cjs",
  "services/api-nest/src/opportunities/operator-mall-product.admin-http.cjs",
  "services/api-nest/src/referral/reseller-id.isolation.cjs",
  "services/api-nest/src/referral/reseller-id.persist.isolation.cjs",
  "services/api-nest/src/ledger/money-authority.isolation.cjs",
];

const failed = [];
for (const rel of files) {
  const r = spawnSync(process.execPath, [path.join(root, rel)], {
    cwd: root,
    encoding: "utf8",
  });
  process.stdout.write(r.stdout || "");
  process.stderr.write(r.stderr || "");
  if (r.status !== 0) failed.push(rel);
}

if (failed.length) {
  console.error("[verify:operator-quota-grade] FAIL\n- " + failed.join("\n- "));
  process.exit(1);
}
console.log("[verify:operator-quota-grade] PASS");
