/**
 * verify:backend-ownership-drift — 커밋된 소유권 그래프(quality/backend-file-ownership.json)가 현재 트리와 일치하는지
 * `node tooling/backend/ownership-graph.cjs --check` 로 확인한다 (CI job `repository-boundary` · T2).
 * UNKNOWN 이 남거나 class/decision 드리프트가 있으면 exit 1 (재생성: pnpm backend:ownership-graph).
 */
"use strict";
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const r = spawnSync(process.execPath, [path.join(root, "tooling/backend/ownership-graph.cjs"), "--check"], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
process.stdout.write(r.stdout || "");
process.stderr.write(r.stderr || "");
if (r.status !== 0) {
  console.error("[verify:backend-ownership-drift] FAIL (regenerate with pnpm backend:ownership-graph and commit both quality/backend-*.json)");
  process.exit(1);
}
console.log("[verify:backend-ownership-drift] PASS");
