/**
 * 기존 verify:* 스크립트를 자식 프로세스로 실행해 결과를 수집 (제품 코드 0)
 */
"use strict";

const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { ROOT } = require("./hash-scope.cjs");

/**
 * @param {string} scriptRel tooling/verify/*.cjs relative to repo root
 * @param {{ timeoutMs?: number }} [opts]
 */
function spawnVerify(scriptRel, opts = {}) {
  const abs = path.join(ROOT, scriptRel);
  const timeoutMs = opts.timeoutMs ?? 120_000;
  const r = spawnSync(process.execPath, [abs], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: timeoutMs,
    env: process.env,
  });
  const stdout = r.stdout || "";
  const stderr = r.stderr || "";
  return {
    script: scriptRel.replace(/\\/g, "/"),
    exitCode: r.status === null ? 124 : r.status,
    signal: r.signal || null,
    ok: r.status === 0,
    stdout: stdout.slice(0, 4000),
    stderr: stderr.slice(0, 4000),
    summary: (stdout || stderr).split("\n").filter(Boolean).slice(-3).join(" | "),
  };
}

module.exports = { spawnVerify };
