/**
 * verify:backend — tooling/verify/backend/<domain>/*.cjs 전부 순차 실행.
 * 하나라도 FAIL → exit 1 · 실행 대상 0개 → FAIL (빈 통과 금지) · skip 없음.
 * 각 테스트는 원본 mixed 검증기(복구 기준 SHA 86f15964)에서 백엔드 어서션만 옮긴 것이다.
 */
"use strict";
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../../..");
const selfPath = path.resolve(__filename);

function collect(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const ent of entries) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      collect(p, out);
    } else if (ent.isFile() && ent.name.endsWith(".cjs") && path.resolve(p) !== selfPath) {
      out.push(p);
    }
  }
  return out;
}

const files = collect(__dirname, []);
if (files.length === 0) {
  console.error("[verify:backend] FAIL no backend tests found under tooling/verify/backend");
  process.exit(1);
}

const startedAt = Date.now();
const failed = [];
for (const file of files) {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  const r = spawnSync(process.execPath, [file], { cwd: root, encoding: "utf8" });
  process.stdout.write(r.stdout || "");
  process.stderr.write(r.stderr || "");
  if (r.status !== 0) {
    failed.push(rel);
    console.error(`[verify:backend] FAIL at ${rel} (exit ${r.status})`);
  }
}

const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
if (failed.length) {
  console.error(`[verify:backend] FAIL (${failed.length}/${files.length} failed · ${elapsedSec}s)`);
  for (const f of failed) console.error(" - " + f);
  process.exit(1);
}
console.log(`[verify:backend] PASS (${files.length} backend tests · ${elapsedSec}s)`);
