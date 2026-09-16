/**
 * CMS 상태기계 + AdminGuard HTTP.
 */
"use strict";

const { spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "../../../..");
const fs = require("fs");
const files = ["services/api-nest/src/cms/cms.spec.runtime.cjs"];
const adminCtl = fs.readFileSync(
  path.join(root, "services/api-nest/src/cms/cms.admin.controller.ts"),
  "utf8",
);
if (!adminCtl.includes("@UseGuards(AdminGuard)")) {
  console.error("[verify:cms-posts] FAIL admin controller missing AdminGuard");
  process.exit(1);
}
if (!adminCtl.includes("cms/:kind/:id/publish") && !adminCtl.includes("CMS_ADMIN_ROUTES.publish")) {
  console.error("[verify:cms-posts] FAIL publish route missing");
  process.exit(1);
}

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
  console.error("[verify:cms-posts] FAIL\n- " + failed.join("\n- "));
  process.exit(1);
}
console.log("[verify:cms-posts] PASS");
