"use strict";

/**
 * verify:workflow-action-pin
 * Production deploy를 실행하지 않는다.
 * engine-acceptance.yml 핀은 CONTROLLED_AMENDMENT 전까지 HOLD.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const HOLDS = new Set(["engine-acceptance.yml", "ebay-fault-injection.yml"]);
const SHA = /@[0-9a-f]{40}(?:\s|#|"|'|$)/i;
const MUTABLE = /uses:\s*([^\s]+@(?:v\d+|stable|main|master|latest))\b/;
const WRITE_ALL = /permissions:\s*write-all/;

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function must(cond, msg) {
  if (!cond) fails.push(msg);
}

const pins = JSON.parse(read("governance/security/workflow-action-pins.v1.json"));
must(pins.engine_acceptance_yml === "HOLD_CONTROLLED_AMENDMENT", "engine-acceptance HOLD lock");
must(pins.holds && pins.holds["engine-acceptance.yml"] === "HOLD_CONTROLLED_AMENDMENT", "holds.engine-acceptance");
must(pins.holds && pins.holds["ebay-fault-injection.yml"] === "HOLD_WORKTREE_NEST_TSC", "holds.ebay-fault-injection");
must(pins.pins["actions/checkout@v6"] === "d23441a48e516b6c34aea4fa41551a30e30af803", "checkout pin");
must(pins.pins["pnpm/action-setup@v6"] === "f520eceda224fe1a4aed5a2a27a194379a409996", "pnpm pin");
must(pins.pins["github/codeql-action@v3"] === "5ba2889ada762081db2c4f32a729827dce632c7b", "codeql pin");

const dir = path.join(root, ".github/workflows");
const files = fs.readdirSync(dir).filter((n) => n.endsWith(".yml"));
for (const hold of HOLDS) must(files.includes(hold), hold + " present");
must(files.includes("codeql.yml"), "codeql.yml required");
must(fs.existsSync(path.join(root, ".github/dependabot.yml")), "dependabot.yml required");

const dependabot = read(".github/dependabot.yml");
must(dependabot.includes("package-ecosystem: github-actions"), "dependabot github-actions");
must(!/package-ecosystem:\s*npm/.test(dependabot), "dependabot npm would duplicate REL-402");

for (const name of files) {
  const text = fs.readFileSync(path.join(dir, name), "utf8");
  must(!WRITE_ALL.test(text), name + " write-all forbidden");
  if (HOLDS.has(name)) {
    must(/uses:\s*actions\/checkout@v6/.test(text), name + " HOLD must remain tag-based until follow-up");
    continue;
  }
  must(/^permissions:/m.test(text) || /\npermissions:/m.test(text), name + " missing permissions");
  const uses = text.split(/\r?\n/).filter((l) => /^\s+-?\s*uses:/.test(l) || /^\s+uses:/.test(l));
  for (const line of uses) {
    const m = line.match(/uses:\s*(\S+)/);
    if (!m) continue;
    const spec = m[1];
    if (spec.startsWith("./") || spec.startsWith("docker://")) continue;
    must(SHA.test(spec) || /@[0-9a-f]{40}/i.test(spec), name + " unpinned " + spec);
    must(!MUTABLE.test(line) || /@[0-9a-f]{40}/i.test(spec), name + " mutable ref " + spec);
  }
}

const codeql = read(".github/workflows/codeql.yml");
must(codeql.includes("security-events: write"), "codeql job security-events");
must(!/write-all/.test(codeql), "codeql write-all");
must(codeql.includes("javascript-typescript"), "codeql language");

if (fails.length) {
  console.error("[verify:workflow-action-pin] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:workflow-action-pin] PASS");
console.log("  engine-acceptance.yml = HOLD_CONTROLLED_AMENDMENT");
console.log("  ebay-fault-injection.yml = HOLD_WORKTREE_NEST_TSC");
console.log("  dependabot = github-actions only");
