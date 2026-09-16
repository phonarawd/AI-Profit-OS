"use strict";
const { spawnSync } = require("child_process");
const path = require("path");
const file = path.resolve(
  __dirname,
  "../../../../services/api-nest/src/cms/cms.spec.runtime.cjs",
);
const r = spawnSync(process.execPath, [file], { encoding: "utf8" });
process.stdout.write(r.stdout || "");
process.stderr.write(r.stderr || "");
if (r.status !== 0) process.exit(r.status || 1);
console.log("[cms.admin-http] spec runner ok");
