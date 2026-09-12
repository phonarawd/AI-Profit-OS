/**
 * verify:workers-typecheck — KEEP Worker 패키지 전부를 tsc --noEmit 으로 타입검사한다 (CI job `typecheck` · T2).
 * 대상 = git 추적 `workers/* /tsconfig.json` 중 소유권 JSON 에서 package.json 이 KEEP 인 worker
 *        (MOVE/DELETE 판정 worker 는 9단계 정리 대상이라 목록에 표시만 하고 검사하지 않는다).
 * 하나라도 오류면 exit 1 · 첫 실패에서 멈추지 않는다.
 */
"use strict";
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const tag = "[verify:workers-typecheck]";
const tscBin = require.resolve("typescript/bin/tsc");

const tsconfigs = execFileSync("git", ["ls-files", "-z", "--", "workers/*/tsconfig.json"], { cwd: root, encoding: "utf8" })
  .split("\0")
  .filter(Boolean)
  .map((p) => p.replace(/\\/g, "/"))
  .sort();
if (!tsconfigs.length) {
  console.error(tag + " FAIL no workers/*/tsconfig.json tracked");
  process.exit(1);
}

let decisions = new Map();
try {
  const own = JSON.parse(fs.readFileSync(path.join(root, "quality/backend-file-ownership.json"), "utf8"));
  decisions = new Map(own.files.map((f) => [f.path, f.decision]));
} catch {
  decisions = new Map();
}

const results = [];
for (const ts of tsconfigs) {
  const dir = path.posix.dirname(ts);
  const name = path.posix.basename(dir);
  const decision = decisions.get(dir + "/package.json") || "KEEP";
  if (decision !== "KEEP") {
    console.log(tag + " skip " + name.padEnd(28) + " decision=" + decision + " (9th stage cleanup target · not a KEEP worker)");
    continue;
  }
  const started = Date.now();
  const r = spawnSync(process.execPath, [tscBin, "--noEmit", "-p", ts], { cwd: root, encoding: "utf8" });
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  if (r.status !== 0) {
    process.stdout.write(r.stdout || "");
    process.stderr.write(r.stderr || "");
  }
  results.push({ name, ok: r.status === 0 });
  console.log(tag + " " + (r.status === 0 ? "ok  " : "FAIL") + " " + name.padEnd(28) + " (" + elapsed + "s)");
}

if (!results.length) {
  console.error(tag + " FAIL no KEEP worker was type-checked");
  process.exit(1);
}
const failed = results.filter((r) => !r.ok);
if (failed.length) {
  console.error(tag + " FAIL (" + failed.map((f) => f.name).join(", ") + ")");
  process.exit(1);
}
console.log(tag + " PASS (" + results.length + " KEEP workers · tsc --noEmit)");
