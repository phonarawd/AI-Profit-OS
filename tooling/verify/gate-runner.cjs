/** Shared gate step runner (ADR-016 · 3-tier) */
const { spawnSync } = require("child_process");
const path = require("path");
const stamp = require("./lib/gate-stamp.cjs");

const verifyDir = __dirname;
const root = path.resolve(verifyDir, "../..");

function runGateSteps(steps, label) {
  const unique = [...new Set(steps)];
  const skip = stamp.trySkip(label, unique, { cwd: root });
  if (skip.ok) {
    console.log(`[${label}] PASS (${unique.length} steps · stamp hit)`);
    return;
  }

  let failed = false;

  for (const step of unique) {
    const r = spawnSync(process.execPath, [path.join(verifyDir, step)], {
      cwd: root,
      encoding: "utf8",
    });
    process.stdout.write(r.stdout || "");
    process.stderr.write(r.stderr || "");
    if (r.status !== 0) {
      failed = true;
      console.error(`[${label}] FAIL at ${step}`);
      break;
    }
  }

  if (failed) process.exit(1);
  stamp.write(label, unique, { cwd: root });
  console.log(`[${label}] PASS (${unique.length} steps)`);
}

module.exports = { runGateSteps, verifyDir, root };
