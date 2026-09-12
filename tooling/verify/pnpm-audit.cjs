/**
 * verify:pnpm-audit — `pnpm audit --prod --audit-level=moderate` (CI job `security` · T2).
 * 임계값(moderate)은 낮추지 않는다. 실패는 9단계 보안 치유 to-do 로 보고한다 (registry 오류도 숨기지 않는다).
 * REL-402 (`tooling/security/dependency-audit.cjs` · AIPO_AUDIT=1) 와 별개의 원시 감사 결과다.
 */
"use strict";
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const tag = "[verify:pnpm-audit]";
const started = Date.now();
const r = spawnSync("pnpm", ["audit", "--prod", "--audit-level=moderate"], { cwd: root, encoding: "utf8", shell: true, maxBuffer: 64 * 1024 * 1024 });
process.stdout.write(r.stdout || "");
process.stderr.write(r.stderr || "");
const elapsed = ((Date.now() - started) / 1000).toFixed(1);
if (r.status !== 0) {
  console.error(tag + " FAIL (pnpm audit --prod --audit-level=moderate exit " + r.status + " · " + elapsed + "s · threshold not lowered)");
  process.exit(1);
}
console.log(tag + " PASS (no moderate+ advisories in production dependencies · " + elapsed + "s)");
