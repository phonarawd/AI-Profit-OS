/**
 * Isolated CI Postgres fault/recovery — docker stop/start 우선.
 * 제품 fault 엔드포인트 없음.
 */
"use strict";

const { execFileSync } = require("node:child_process");
const { pingPostgres } = require("./ci-postgres.cjs");
const { resolveHarnessDatabaseUrl } = require("../kill-switch.cjs");

function sh(cmd, args, opts = {}) {
  try {
    const out = execFileSync(cmd, args, {
      encoding: "utf8",
      timeout: opts.timeout || 20_000,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, stdout: String(out || "").trim() };
  } catch (e) {
    return {
      ok: false,
      stdout: String((e && e.stdout) || "").trim(),
      stderr: String((e && e.stderr) || "").trim(),
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

function dockerAvailable() {
  const r = sh("docker", ["info"]);
  return r.ok;
}

function findPostgresContainer(opts = {}) {
  if (opts.containerName) return opts.containerName;
  if (process.env.AIPO_QA_PG_CONTAINER) return process.env.AIPO_QA_PG_CONTAINER;
  const names = sh("docker", ["ps", "--format", "{{.Names}}\t{{.Image}}"]);
  if (!names.ok) return null;
  const lines = names.stdout.split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    const [name, image] = line.split("\t");
    if (!name) continue;
    if (/postgres/i.test(name) || /pgvector|postgres/i.test(image || "")) {
      return name;
    }
  }
  return null;
}

function dockerStop(name) {
  return sh("docker", ["stop", name]);
}

function dockerStart(name) {
  return sh("docker", ["start", name]);
}

/**
 * @returns {{
 *   strategy: string,
 *   executable: boolean,
 *   findings: string[],
 *   container: string|null,
 * }}
 */
function selectDbFaultStrategy(opts = {}) {
  const findings = [];
  if (!dockerAvailable()) {
    findings.push("docker CLI unavailable");
    return {
      strategy: "unavailable",
      executable: false,
      findings,
      container: null,
    };
  }
  const container = findPostgresContainer(opts);
  if (!container) {
    findings.push("no postgres/pgvector container on docker ps");
    return {
      strategy: "unavailable",
      executable: false,
      findings,
      container: null,
    };
  }
  findings.push(`docker stop/start ${container}`);
  return {
    strategy: "docker_stop_start",
    executable: true,
    findings,
    container,
  };
}

async function induceDbFault(opts = {}) {
  const plan = selectDbFaultStrategy(opts);
  if (!plan.executable) {
    return {
      status: "BLOCKED_ENV_CAPABILITY",
      plan,
      induced: false,
    };
  }
  const stop = dockerStop(plan.container);
  return {
    status: stop.ok ? "INDUCED" : "HARNESS_FAILURE",
    plan,
    induced: stop.ok,
    stop,
  };
}

async function restoreDb(opts = {}) {
  const plan = selectDbFaultStrategy(opts);
  if (!plan.executable) {
    return { status: "BLOCKED_ENV_CAPABILITY", restored: false, plan };
  }
  const start = dockerStart(plan.container);
  if (!start.ok) {
    return { status: "HARNESS_FAILURE", restored: false, plan, start };
  }
  const databaseUrl = opts.databaseUrl || resolveHarnessDatabaseUrl();
  if (databaseUrl) {
    for (let i = 0; i < 20; i++) {
      const ping = await pingPostgres(databaseUrl);
      if (ping.ok) return { status: "RESTORED", restored: true, plan, ping };
      await new Promise((r) => setTimeout(r, 1000));
    }
    return { status: "HARNESS_FAILURE", restored: false, plan, reason: "ping_timeout" };
  }
  return { status: "RESTORED", restored: true, plan };
}

module.exports = {
  dockerAvailable,
  findPostgresContainer,
  selectDbFaultStrategy,
  induceDbFault,
  restoreDb,
};
