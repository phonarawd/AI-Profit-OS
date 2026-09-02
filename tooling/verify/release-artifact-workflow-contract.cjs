"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const acceptancePath = path.join(root, ".github/workflows/release-acceptance.yml");
const buildPath = path.join(root, ".github/workflows/release-build.yml");

const acceptance = fs.readFileSync(acceptancePath, "utf8");
const build = fs.readFileSync(buildPath, "utf8");
const fails = [];

const verdictStep = acceptance.match(
  /- name: Fail-closed release verdict[\s\S]*?(?=\n\s{6}- name:|$)/,
)?.[0] || "";

if (!verdictStep) {
  fails.push("missing Fail-closed release verdict step");
} else {
  if (!/run:\s*\|/.test(verdictStep)) {
    fails.push("release verdict step must use a block shell");
  }
  if (!/set -euo pipefail/.test(verdictStep)) {
    fails.push("release verdict step must enable pipefail");
  }
  if (
    !/release-acceptance-verdict\.cjs[\s\S]*?\|\s*tee\s+_tmp_release_acceptance\/verdict\.json/.test(
      verdictStep,
    )
  ) {
    fails.push("release verdict command must pipe canonical verdict to verdict.json");
  }
}

const uploadStep = build.match(
  /- name: Upload release-bundle[\s\S]*?(?=\n\s{6}- name:|$)/,
)?.[0] || "";

if (!uploadStep) {
  fails.push("missing Upload release-bundle step");
} else if (!/include-hidden-files:\s*true/.test(uploadStep)) {
  fails.push("release-bundle upload must preserve hidden files");
}

if (fails.length) {
  console.error("[verify:release-artifact-workflow-contract] FAIL");
  for (const fail of fails) console.error("- " + fail);
  process.exit(1);
}

console.log("[verify:release-artifact-workflow-contract] PASS");
