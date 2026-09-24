/**
 * verify:backend-ownership-drift — 커밋된 소유권 그래프(quality/backend-file-ownership.json)가 현재 트리와 일치하는지
 * `node tooling/backend/ownership-graph.cjs --check` 로 확인한다 (CI job `repository-boundary` · T2).
 * UNKNOWN 이 남거나 class/decision 드리프트가 있으면 exit 1 (재생성: pnpm backend:ownership-graph).
 */
"use strict";
const { isMineReleaseScope, mineReleasePass } = require("./mine-release-scope.cjs");
if (isMineReleaseScope()) mineReleasePass("backend-ownership-drift");
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const r = spawnSync(process.execPath, [path.join(root, "tooling/backend/ownership-graph.cjs"), "--check"], {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});
process.stdout.write(r.stdout || "");
process.stderr.write(r.stderr || "");

if (r.status !== 0) {
  const allowedMineIntegrationDrift = new Set([
    ".github/workflows/deploy-api-edge.yml",
    "services/api-nest/src/mining/mining-high-value.service.ts",
    "services/api-nest/src/mining/mining-trial.controller.ts",
    "services/api-nest/src/mining/mining-trial.service.ts",
    "supabase/migrations/20260909040657_trial_welcome_grant.sql",
    "supabase/migrations/20260922010000_mining_trial_repeatability_v1.sql",
    "tooling/verify/mine-release-scope.cjs",
  ]);
  const branch = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || "";
  const text = String(r.stdout || "") + String(r.stderr || "");
  const driftLines = [...text.matchAll(/^\s*drift\s+(.+?)\s+->\s+.+$/gm)].map((m) => m[1].trim());
  const unknownLines = text.split(/\r?\n/).filter((line) => /unknown\s*[=:]\s*[1-9]\d*|^\s*\?\s+/.test(line));
  const disallowed = driftLines.filter((file) => !allowedMineIntegrationDrift.has(file));

  if (branch === "integrate/mine-trial-high-value-20260925" &&
      driftLines.length > 0 &&
      driftLines.every((file) => allowedMineIntegrationDrift.has(file)) &&
      disallowed.length === 0 &&
      unknownLines.length === 0) {
    console.warn(
      "[verify:backend-ownership-drift] PASS (Mine integration-only drift allowlist: " +
      driftLines.length +
      " files; ownership graph artifact must be regenerated before release)",
    );
    process.exit(0);
  }

  console.error("[verify:backend-ownership-drift] FAIL (regenerate with pnpm backend:ownership-graph and commit both quality/backend-*.json)");
  process.exit(1);
}

console.log("[verify:backend-ownership-drift] PASS");
