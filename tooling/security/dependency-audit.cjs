/**
 * REL-402 pnpm audit runner.
 * 예외는 스펙에 적힌 것만 --ignore 하고, 적용 순간을 로그로 남긴다.
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const SPEC_REL = "governance/security/dependency-audit.v1.json";
const root = path.resolve(__dirname, "../..");

function loadSpec() {
  return JSON.parse(fs.readFileSync(path.join(root, SPEC_REL), "utf8"));
}

function exceptionArgs(spec) {
  const args = [];
  for (const ex of spec.exceptions || []) {
    const id = String((ex && ex.id) || "").trim();
    const reason = String((ex && ex.reason) || "").trim();
    if (!id) throw new Error("audit exception missing id");
    if (!reason) throw new Error("audit exception missing reason: " + id);
    console.log("[rel-402] documented exception " + id + " — " + reason);
    args.push("--ignore", id);
  }
  return args;
}

function runAudit(opts) {
  const spec = (opts && opts.spec) || loadSpec();
  const args = ["audit", "--audit-level", spec.auditLevel].concat(
    exceptionArgs(spec),
  );
  const r = spawnSync("pnpm", args, {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  return r.status === 0;
}

module.exports = { SPEC_REL, loadSpec, exceptionArgs, runAudit };

if (require.main === module) {
  if (!runAudit()) process.exit(1);
}
