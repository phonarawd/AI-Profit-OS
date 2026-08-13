/**
 * Isolated CI Postgres fault/recovery — docker stop/start 우선.
 * 제품 fault 엔드포인트 없음.
 *
 * 복구 시 중지된 컨테이너를 `docker ps`(running only)로 다시 찾으면
 * start 대상이 사라져 HARNESS_RECOVERY_DEFECT 가 된다.
 * induce 때 잡은 이름/ID 를 restore 에 고정하고, 탐색은 `docker ps -a`.
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
    return { ok: true, stdout: String(out || "").trim(), stderr: "" };
  } catch (e) {
    return {
      ok: false,
      stdout: String((e && e.stdout) || "").trim(),
      stderr: String((e && e.stderr) || "").trim(),
      message: e instanceof Error ? e.message : String(e),
      status: typeof e.status === "number" ? e.status : null,
    };
  }
}

function dockerAvailable() {
  const r = sh("docker", ["info"]);
  return r.ok;
}

/**
 * docker ps [--all] 포맷 줄을 파싱한다 (셀프테스트용 순수함수).
 * @param {string} stdout
 * @returns {Array<{id:string,name:string,image:string,status:string,ports:string}>}
 */
function parseDockerPsLines(stdout) {
  const lines = String(stdout || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.map((line) => {
    const [id, name, image, status, ports] = line.split("\t");
    return {
      id: id || "",
      name: name || "",
      image: image || "",
      status: status || "",
      ports: ports || "",
    };
  });
}

function isPostgresContainerRow(row) {
  if (!row || !row.name) return false;
  if (/postgres/i.test(row.name)) return true;
  if (/pgvector|postgres/i.test(row.image || "")) return true;
  return false;
}

function pickPostgresContainer(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const hit = list.find(isPostgresContainerRow);
  return hit ? hit.name : null;
}

function listDockerContainers(opts = {}) {
  const args = ["ps"];
  if (opts.includeStopped) args.push("-a");
  args.push("--format", "{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}");
  const listed = sh("docker", args);
  if (!listed.ok) {
    return { ok: false, rows: [], error: listed.stderr || listed.message };
  }
  return { ok: true, rows: parseDockerPsLines(listed.stdout) };
}

function findPostgresContainer(opts = {}) {
  if (opts.containerName) return opts.containerName;
  if (process.env.AIPO_QA_PG_CONTAINER) return process.env.AIPO_QA_PG_CONTAINER;
  const listed = listDockerContainers({
    includeStopped: opts.includeStopped === true,
  });
  if (!listed.ok) return null;
  return pickPostgresContainer(listed.rows);
}

function inspectContainer(name) {
  if (!name) return { ok: false, error: "no_container_name" };
  const r = sh("docker", ["inspect", name]);
  if (!r.ok) {
    return {
      ok: false,
      name,
      error: r.stderr || r.message,
      status: r.status,
    };
  }
  try {
    const arr = JSON.parse(r.stdout);
    const info = arr && arr[0];
    if (!info) return { ok: false, name, error: "inspect_empty" };
    return {
      ok: true,
      name,
      id: info.Id || null,
      running: info.State && info.State.Running === true,
      paused: info.State && info.State.Paused === true,
      status: (info.State && info.State.Status) || null,
      exitCode: info.State && typeof info.State.ExitCode === "number" ? info.State.ExitCode : null,
      health: (info.State && info.State.Health && info.State.Health.Status) || null,
      pid: info.State && info.State.Pid ? info.State.Pid : null,
    };
  } catch (e) {
    return {
      ok: false,
      name,
      error: e instanceof Error ? e.message : "inspect_parse",
    };
  }
}

function dockerLogsTail(name, n = 40) {
  const r = sh("docker", ["logs", "--tail", String(n), name], { timeout: 15_000 });
  const text = `${r.stdout || ""}\n${r.stderr || ""}`.trim().slice(-4000);
  return { ok: r.ok, text };
}

function dockerStop(name) {
  return sh("docker", ["stop", name]);
}

function dockerStart(name) {
  return sh("docker", ["start", name]);
}

function pgIsReadyInContainer(name, opts = {}) {
  const user = opts.user || process.env.AIPO_QA_PGUSER || "postgres";
  const db = opts.database || process.env.AIPO_QA_PGDATABASE || "aipo_qa_synth";
  return sh("docker", ["exec", name, "pg_isready", "-U", user, "-d", db]);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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
    findings.push(
      opts.includeStopped
        ? "no postgres/pgvector container on docker ps -a"
        : "no postgres/pgvector container on docker ps",
    );
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
  const plan = selectDbFaultStrategy({ ...opts, includeStopped: false });
  if (!plan.executable) {
    return {
      status: "BLOCKED_ENV_CAPABILITY",
      plan,
      induced: false,
    };
  }
  const inspectBefore = inspectContainer(plan.container);
  const stop = dockerStop(plan.container);
  const inspectAfterStop = inspectContainer(plan.container);
  return {
    status: stop.ok ? "INDUCED" : "HARNESS_FAILURE",
    plan,
    induced: stop.ok,
    container: plan.container,
    inspectBefore,
    stop,
    inspectAfterStop,
  };
}

/**
 * 중지된 컨테이너를 다시 찾기 위해 includeStopped 또는 고정 이름을 사용한다.
 */
async function restoreDb(opts = {}) {
  const pinned =
    opts.containerName || opts.container || process.env.AIPO_QA_PG_CONTAINER || null;
  const plan = pinned
    ? {
        strategy: "docker_stop_start",
        executable: true,
        findings: [`restore pinned container ${pinned}`],
        container: pinned,
      }
    : selectDbFaultStrategy({ ...opts, includeStopped: true });
  if (!plan.executable) {
    return { status: "BLOCKED_ENV_CAPABILITY", restored: false, plan };
  }

  const inspectBeforeStart = inspectContainer(plan.container);
  const start = dockerStart(plan.container);
  if (!start.ok) {
    const logs = dockerLogsTail(plan.container);
    return {
      status: "HARNESS_FAILURE",
      restored: false,
      plan,
      start,
      inspectBeforeStart,
      inspectAfterStart: inspectContainer(plan.container),
      logs,
      reason: "docker_start_failed",
    };
  }

  const attempts = Number(opts.readyAttempts) > 0 ? Number(opts.readyAttempts) : 30;
  const delayMs = Number(opts.readyDelayMs) > 0 ? Number(opts.readyDelayMs) : 1000;
  const databaseUrl = opts.databaseUrl || resolveHarnessDatabaseUrl();
  const layers = {
    CONTAINER_RECOVERED: false,
    POSTGRES_READY: false,
    DIRECT_CLIENT_RECOVERED: false,
  };
  let lastInspect = inspectContainer(plan.container);
  let lastPgIsReady = null;
  let lastPing = null;

  for (let i = 0; i < attempts; i++) {
    lastInspect = inspectContainer(plan.container);
    layers.CONTAINER_RECOVERED = Boolean(lastInspect.ok && lastInspect.running === true);

    lastPgIsReady = pgIsReadyInContainer(plan.container);
    layers.POSTGRES_READY = Boolean(lastPgIsReady.ok);

    if (databaseUrl) {
      lastPing = await pingPostgres(databaseUrl);
      layers.DIRECT_CLIENT_RECOVERED = Boolean(lastPing && lastPing.ok);
    } else if (layers.POSTGRES_READY) {
      lastPing = { ok: false, detail: "no_databaseUrl" };
    }

    if (
      layers.CONTAINER_RECOVERED &&
      layers.POSTGRES_READY &&
      (databaseUrl ? layers.DIRECT_CLIENT_RECOVERED : true)
    ) {
      return {
        status: "RESTORED",
        restored: true,
        plan,
        start,
        inspectBeforeStart,
        inspectAfterStart: lastInspect,
        pg_isready: lastPgIsReady,
        ping: lastPing,
        layers,
        attempts: i + 1,
      };
    }
    await sleep(delayMs);
  }

  const logs = dockerLogsTail(plan.container);
  return {
    status: "HARNESS_FAILURE",
    restored: false,
    plan,
    start,
    inspectBeforeStart,
    inspectAfterStart: lastInspect,
    pg_isready: lastPgIsReady,
    ping: lastPing,
    layers,
    logs,
    reason: "ready_poll_timeout",
    attempts,
  };
}

module.exports = {
  dockerAvailable,
  parseDockerPsLines,
  pickPostgresContainer,
  isPostgresContainerRow,
  listDockerContainers,
  findPostgresContainer,
  inspectContainer,
  dockerLogsTail,
  dockerStop,
  dockerStart,
  pgIsReadyInContainer,
  selectDbFaultStrategy,
  induceDbFault,
  restoreDb,
};
