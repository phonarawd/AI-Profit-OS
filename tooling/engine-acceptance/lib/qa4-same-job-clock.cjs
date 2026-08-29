/**
 * QA4 same-job clock wiring — harness only · 제품 mutation 0 · workflow yml 0.
 *
 * CI matrix QA4는 run-qa4.cjs만 호출한다. QA5/QA6/QA8처럼 yml에 docker+
 * run-qa4-clock을 넣으면 acceptance_workflow_hash amendment가 필요하므로,
 * full+Actions에서 기존 run-qa4-clock.cjs를 같은 프로세스 트리로 기동한다.
 * 하네스가 없으면 scorer는 기존처럼 FAIL(not_wired) — laundry PASS 금지.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { ROOT } = require("./hash-scope.cjs");
const { resolveHarnessDatabaseUrl, evaluateDbTarget } = require("../kill-switch.cjs");
const { probeQa4ClockHarness } = require("./qa4-clock-evidence.cjs");

const DIST_APP_MODULE = path.join(ROOT, "services/api-nest/dist/app.module.js");
const CLOCK_RUNNER = path.join(ROOT, "tooling/engine-acceptance/run-qa4-clock.cjs");
const PG = Object.freeze({
  name: "aipo-qa-postgres",
  user: "postgres",
  password: "postgres",
  database: "aipo_qa_synth",
  port: "5432",
  image: "pgvector/pgvector:pg16",
});

function sleepMs(ms) {
  const sab = new SharedArrayBuffer(4);
  Atomics.wait(new Int32Array(sab), 0, 0, ms);
}

function dockerAvailable() {
  const r = spawnSync("docker", ["info"], {
    encoding: "utf8",
    timeout: 20_000,
    windowsHide: true,
  });
  return r.status === 0;
}

function applyIsolatedPgEnv() {
  process.env.AIPO_QA_PGHOST = "127.0.0.1";
  process.env.AIPO_QA_PGUSER = PG.user;
  process.env.AIPO_QA_PGPASSWORD = PG.password;
  process.env.AIPO_QA_PGDATABASE = PG.database;
  process.env.AIPO_QA_PGPORT = PG.port;
}

function startIsolatedPostgres() {
  spawnSync("docker", ["rm", "-f", PG.name], {
    encoding: "utf8",
    timeout: 30_000,
    windowsHide: true,
  });
  const run = spawnSync(
    "docker",
    [
      "run",
      "-d",
      "--name",
      PG.name,
      "-e",
      `POSTGRES_USER=${PG.user}`,
      "-e",
      `POSTGRES_PASSWORD=${PG.password}`,
      "-e",
      `POSTGRES_DB=${PG.database}`,
      "-p",
      `${PG.port}:5432`,
      PG.image,
    ],
    { encoding: "utf8", timeout: 180_000, windowsHide: true },
  );
  if (run.status !== 0) {
    const err = new Error(`docker run isolated postgres failed: ${(run.stderr || run.stdout || "").slice(0, 800)}`);
    err.code = "AIPO_QA_HARNESS_FAILURE";
    throw err;
  }
  for (let i = 0; i < 60; i += 1) {
    const ready = spawnSync(
      "docker",
      ["exec", PG.name, "pg_isready", "-U", PG.user, "-d", PG.database],
      { encoding: "utf8", timeout: 10_000, windowsHide: true },
    );
    if (ready.status === 0) return { started: true, attempts: i + 1 };
    sleepMs(1000);
  }
  const err = new Error("isolated postgres readiness timeout");
  err.code = "AIPO_QA_HARNESS_FAILURE";
  throw err;
}

function ensureNestDist() {
  if (fs.existsSync(DIST_APP_MODULE)) return { built: false };
  const pnpmBin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const r = spawnSync(pnpmBin, ["--filter", "@aipo/api-nest", "build"], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 10 * 60 * 1000,
    windowsHide: true,
    env: process.env,
  });
  if (r.status !== 0 || !fs.existsSync(DIST_APP_MODULE)) {
    const err = new Error(`api-nest build failed: ${(r.stderr || r.stdout || "").slice(0, 800)}`);
    err.code = "AIPO_QA_HARNESS_FAILURE";
    throw err;
  }
  return { built: true };
}

function isolatedDatabaseUrl(opts = {}) {
  const databaseUrl = resolveHarnessDatabaseUrl();
  if (!databaseUrl) return "";
  const ev = evaluateDbTarget({
    databaseUrl,
    target_env: opts.target_env || process.env.AIPO_QA_TARGET_ENV || "ci",
  });
  return ev.ok ? databaseUrl : "";
}

function shouldStartDocker(opts = {}) {
  if (isolatedDatabaseUrl(opts)) return false;
  if (process.env.GITHUB_ACTIONS === "true") return true;
  if (process.env.AIPO_QA_WIRE_QA4_CLOCK === "1") return true;
  return false;
}

/**
 * @param {{ target_env?: string, hostname?: string, synthetic_account_namespace?: string, mode?: string }} [opts]
 */
function ensureQa4ClockHarness(opts = {}) {
  const mode = opts.mode === "full" ? "full" : "tiny";
  if (mode !== "full") {
    return { invoked: false, reason: "tiny_mode_skips_clock_boot" };
  }

  const already = probeQa4ClockHarness();
  if (already.available) {
    return { invoked: false, reason: "already_fresh", probed_path: already.probed_path };
  }

  if (!process.env.AIPO_QA_HARNESS_OUT) {
    process.env.AIPO_QA_HARNESS_OUT = path.join(ROOT, "_tmp_qa_harness", "qa4-clock");
  }

  try {
    if (shouldStartDocker(opts)) {
      if (!dockerAvailable()) {
        return { invoked: false, reason: "docker_unavailable", ok: false };
      }
      startIsolatedPostgres();
      applyIsolatedPgEnv();
    }

    const databaseUrl = isolatedDatabaseUrl(opts);
    if (!databaseUrl) {
      return { invoked: false, reason: "no_isolated_postgres", ok: false };
    }

    ensureNestDist();

    const child = spawnSync(
      process.execPath,
      [
        CLOCK_RUNNER,
        "--target-env",
        opts.target_env || process.env.AIPO_QA_TARGET_ENV || "ci",
        "--hostname",
        opts.hostname || process.env.AIPO_QA_HOSTNAME || "localhost",
        "--synthetic-ns",
        opts.synthetic_account_namespace || process.env.AIPO_QA_SYNTHETIC_NS || "qa-synth-ci",
      ],
      {
        cwd: ROOT,
        encoding: "utf8",
        timeout: 12 * 60 * 1000,
        windowsHide: true,
        env: process.env,
      },
    );
    return {
      invoked: true,
      ok: child.status === 0,
      status: child.status,
      reason: child.status === 0 ? "clock_harness_ok" : "clock_harness_nonzero_exit",
      stdout_tail: String(child.stdout || "").slice(-1200),
      stderr_tail: String(child.stderr || "").slice(-1200),
    };
  } catch (e) {
    return {
      invoked: false,
      ok: false,
      reason: "clock_harness_boot_error",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function selfcheck() {
  const prevGa = process.env.GITHUB_ACTIONS;
  const prevWire = process.env.AIPO_QA_WIRE_QA4_CLOCK;
  const prevSuite = process.env.MATRIX_SUITE;
  delete process.env.GITHUB_ACTIONS;
  delete process.env.AIPO_QA_WIRE_QA4_CLOCK;
  delete process.env.MATRIX_SUITE;
  const tiny = ensureQa4ClockHarness({ mode: "tiny", target_env: "ci" });
  const full = ensureQa4ClockHarness({ mode: "full", target_env: "ci" });
  if (prevGa === undefined) delete process.env.GITHUB_ACTIONS;
  else process.env.GITHUB_ACTIONS = prevGa;
  if (prevWire === undefined) delete process.env.AIPO_QA_WIRE_QA4_CLOCK;
  else process.env.AIPO_QA_WIRE_QA4_CLOCK = prevWire;
  if (prevSuite === undefined) delete process.env.MATRIX_SUITE;
  else process.env.MATRIX_SUITE = prevSuite;
  if (tiny.reason !== "tiny_mode_skips_clock_boot") {
    throw new Error(`tiny must skip clock boot, got ${tiny.reason}`);
  }
  if (full.invoked !== false || full.reason !== "no_isolated_postgres") {
    throw new Error(`full without isolated pg must stay fail-closed, got ${JSON.stringify(full)}`);
  }
  console.log("[qa4-same-job-clock] selfcheck PASS");
}

if (require.main === module) {
  selfcheck();
}

module.exports = {
  ensureQa4ClockHarness,
  shouldStartDocker,
  dockerAvailable,
  isolatedDatabaseUrl,
};
