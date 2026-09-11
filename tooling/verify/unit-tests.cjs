/**
 * verify:unit-tests — 백엔드 단위/런타임 테스트 전부를 node:test 로 실행한다 (CI job `unit` · T2).
 * 대상 = git 추적 `services/** /*.runtime.test.ts` (tsc strip-types) + `tooling/** /*.runtime.test.cjs`.
 * 0개면 FAIL (빈 통과 금지) · 하나라도 실패하면 exit 1.
 */
"use strict";
const { execFileSync, spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const tag = "[verify:unit-tests]";

function tracked(patterns) {
  return execFileSync("git", ["ls-files", "-z", "--", ...patterns], { cwd: root, encoding: "utf8" })
    .split("\0")
    .filter(Boolean)
    .map((p) => p.replace(/\\/g, "/"));
}

const tsTests = tracked(["services/**/*.runtime.test.ts", "services/**/*.test.ts"]).filter((f) => !/node_modules|\/dist\//.test(f));
const cjsTests = tracked(["tooling/**/*.runtime.test.cjs", "workers/**/*.test.cjs", "services/**/*.test.cjs"]).filter((f) => !/node_modules/.test(f));
const files = [...new Set([...tsTests, ...cjsTests])].sort();

if (files.length === 0) {
  console.error(tag + " FAIL no backend test files found (services/**/*.runtime.test.ts · tooling/**/*.runtime.test.cjs)");
  process.exit(1);
}

const started = Date.now();
const r = spawnSync(process.execPath, ["--test", "--experimental-strip-types", "--test-reporter=spec", ...files], {
  cwd: root,
  encoding: "utf8",
  env: { ...process.env, NODE_NO_WARNINGS: "1" },
  maxBuffer: 64 * 1024 * 1024,
});
process.stdout.write(r.stdout || "");
process.stderr.write(r.stderr || "");
const elapsed = ((Date.now() - started) / 1000).toFixed(1);
if (r.status !== 0) {
  console.error(tag + " FAIL (" + files.length + " test files · exit " + r.status + " · " + elapsed + "s)");
  process.exit(1);
}
console.log(tag + " PASS (" + files.length + " test files · node:test · " + elapsed + "s)");
for (const f of files) console.log("  - " + f);
