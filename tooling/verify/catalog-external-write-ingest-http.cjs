"use strict";

const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "../..");
const runner = path.join(
  root,
  "services/api-nest/src/opportunities/catalog-external-write.ingest-http.cjs",
);

function compileAndRun() {
  return spawnSync(process.execPath, [runner], {
    cwd: root,
    encoding: "utf8",
    timeout: 60_000,
  });
}

module.exports = { compileAndRun };

if (require.main === module) {
  const ran = compileAndRun();
  if (ran.stdout) process.stdout.write(ran.stdout);
  if (ran.stderr) process.stderr.write(ran.stderr);
  const code = ran.status == null ? 1 : ran.status;
  process.exit(code);
}
