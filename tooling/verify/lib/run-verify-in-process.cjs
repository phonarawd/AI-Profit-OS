/**
 * verify 스크립트 실행기 — 순수 동기 스캐너는 한 프로세스에서 require.
 * child_process 를 쓰는 스크립트는 기존처럼 spawn (이벤트 루프/자식 프로세스 안전).
 */
"use strict";

const { spawnSync } = require("child_process");
const path = require("path");
const {
  tryHit,
  withFsTrace,
  remember,
  isUncacheable,
} = require("./verify-input-cache.cjs");

const EXIT = Symbol("VERIFY_EXIT");
const root = path.resolve(__dirname, "../../..");

function runSpawn(scriptAbs) {
  const r = spawnSync(process.execPath, [scriptAbs], {
    cwd: root,
    encoding: "utf8",
  });
  return {
    status: r.status == null ? 1 : r.status,
    stdout: r.stdout || "",
    stderr: r.stderr || "",
    mode: "spawn",
    cached: false,
  };
}

function runInProcess(scriptAbs) {
  const resolved = require.resolve(scriptAbs);
  const before = new Set(Object.keys(require.cache));
  const origExit = process.exit;
  const prevExitCode = process.exitCode;
  process.exitCode = 0;

  process.exit = function (code) {
    const err = new Error("VERIFY_EXIT");
    err[EXIT] = true;
    err.status = code == null ? 0 : Number(code);
    throw err;
  };

  let status = 0;
  try {
    delete require.cache[resolved];
    require(resolved);
    if (process.exitCode) status = Number(process.exitCode);
  } catch (err) {
    if (err && err[EXIT]) {
      status = err.status;
    } else {
      throw err;
    }
  } finally {
    process.exit = origExit;
    process.exitCode = prevExitCode;
    for (const key of Object.keys(require.cache)) {
      if (before.has(key)) continue;
      if (key.includes("node_modules")) continue;
      delete require.cache[key];
    }
  }

  return { status, stdout: "", stderr: "", mode: "in-process", cached: false };
}

function runVerifyScript(scriptAbs, opts) {
  const allowCache = !opts || opts.allowCache !== false;
  if (allowCache && tryHit(scriptAbs)) {
    return {
      status: 0,
      stdout: "",
      stderr: "",
      mode: "cache",
      cached: true,
    };
  }

  if (isUncacheable(scriptAbs)) {
    return runSpawn(scriptAbs);
  }

  const traced = withFsTrace(() => runInProcess(scriptAbs));
  const result = traced.result;
  if (allowCache) remember(scriptAbs, traced.inputs, result.status);
  return result;
}

module.exports = { runVerifyScript, runInProcess, runSpawn };
