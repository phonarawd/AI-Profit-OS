/** T0 wrapper → domain-by-path.selftest.cjs */
"use strict";
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const catalog = fs.readFileSync(path.join(root, "tooling/verify/CATALOG.md"), "utf8");
if (!catalog.includes("| domain-by-path-ci |")) {
  console.error("[verify:domain-by-path-ci] FAIL CATALOG.md must list domain-by-path-ci");
  process.exit(1);
}
const script = path.join(__dirname, "domain-by-path.selftest.cjs");
const r = spawnSync(process.execPath, [script], {
  cwd: root,
  encoding: "utf8",
  stdio: "inherit",
});
process.exit(r.status === 0 ? 0 : 1);
