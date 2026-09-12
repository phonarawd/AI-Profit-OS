/**
 * verify:backend — tooling/verify/backend/<domain>/*.cjs 전부 순차 실행.
 * 하나라도 FAIL → exit 1 · 실행 대상 0개 → FAIL (빈 통과 금지) · skip 없음.
 * 각 테스트는 원본 mixed 검증기(복구 기준 SHA 86f15964)에서 백엔드 어서션만 옮긴 것이다.
 *
 *   node tooling/verify/backend/run-all.cjs                    전 도메인 (T1 · 로컬 push gate)
 *   node tooling/verify/backend/run-all.cjs --domain auth      한 도메인만 (CI 도메인 job · 존재하지 않는 도메인 → FAIL)
 *   node tooling/verify/backend/run-all.cjs --domain a --domain b
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

/** 도메인 = tooling/verify/backend 바로 아래 디렉터리 이름 (정렬) */
function domains() {
  return fs
    .readdirSync(__dirname, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function parseDomains(argv) {
  const out = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--domain") out.push(...String(argv[i + 1] || "").split(",").map((s) => s.trim()).filter(Boolean));
    else if (argv[i].startsWith("--domain=")) out.push(...argv[i].slice(9).split(",").map((s) => s.trim()).filter(Boolean));
  }
  return out;
}

function main() {
  const wanted = parseDomains(process.argv.slice(2));
  const all = domains();
  const unknown = wanted.filter((d) => !all.includes(d));
  if (unknown.length) {
    console.error("[verify:backend] FAIL unknown domain(s): " + unknown.join(", ") + " (available: " + all.join(", ") + ")");
    process.exit(1);
  }
  const roots = wanted.length ? wanted.map((d) => path.join(__dirname, d)) : [__dirname];
  const files = roots.flatMap((r) => collect(r, []));
  if (files.length === 0) {
    console.error("[verify:backend] FAIL no backend tests found under tooling/verify/backend" + (wanted.length ? " (" + wanted.join(", ") + ")" : ""));
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
  const label = wanted.length ? wanted.join(",") : "all domains";
  if (failed.length) {
    console.error(`[verify:backend] FAIL (${failed.length}/${files.length} failed · ${label} · ${elapsedSec}s)`);
    for (const f of failed) console.error(" - " + f);
    process.exit(1);
  }
  console.log(`[verify:backend] PASS (${files.length} backend tests · ${label} · ${elapsedSec}s)`);
}

module.exports = { domains, collect };

if (require.main === module) main();
