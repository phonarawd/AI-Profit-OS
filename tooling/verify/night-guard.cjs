/** T0 wrapper → scripts/verify-night-guard.mjs */
"use strict";
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const script = path.join(root, "scripts", "verify-night-guard.mjs");
const r = spawnSync(process.execPath, [script], {
  cwd: root,
  encoding: "utf8",
  stdio: "inherit",
});
process.exit(r.status === 0 ? 0 : 1);
