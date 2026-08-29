/**
 * L6 Production kill-switch — harness only · 제품 코드 변경 0
 *
 * destructive QA 전 필수:
 *  - target_env allowlist
 *  - hostname allowlist
 *  - synthetic account namespace prefix
 *
 * production-like면 즉시 abort (exit 2)
 */
"use strict";

const ALLOWED_TARGET_ENV = new Set([
  "local",
  "ci",
  "acceptance",
  "ephemeral",
  "qa",
]);

/** 허용 hostname (로컬/CI ephemeral만) */
const HOSTNAME_ALLOWLIST = [
  /^localhost$/i,
  /^127\.0\.0\.1$/,
  /^::1$/,
  /^.*\.actions\.githubusercontent\.local$/i,
  /^runner-/i,
  /^fv-az/i, // GitHub-hosted runner common prefix
];

/** production-like 즉시 거부 */
const HOSTNAME_DENY = [
  /peotteok\.(com|kr|app)$/i,
  /ai-profit-os/i,
  /aiprofit/i,
  /\.workers\.dev$/i,
  /\.pages\.dev$/i,
  /supabase\.co$/i,
];

const SYNTHETIC_NS_RE = /^qa-synth-[a-z0-9][a-z0-9_-]{1,62}$/i;

/** DATABASE_URL 거부 — 공유 Supabase / 프로덕션 / 임의 원격. 루프백·GHA 서비스만 허용. */
const DB_URL_DENY = [
  /supabase\.co/i,
  /supabase\.com/i,
  /peotteok\.(com|kr|app)/i,
  /ai-profit-os/i,
  /aiprofit/i,
  /\.workers\.dev/i,
  /\.pages\.dev/i,
  /aws-\d-/i,
  /\.rds\.amazonaws\.com/i,
  /\.pooler\.supabase/i,
];

const DB_HOST_ALLOW = [
  /^localhost$/i,
  /^127\.0\.0\.1$/,
  /^::1$/,
  /^postgres$/i,
  /^pg$/i,
  /^aipo-qa.*-pg$/i,
];

function parseDbHost(databaseUrl) {
  const raw = String(databaseUrl || "");
  if (!raw) return "";
  try {
    const u = new URL(raw.replace(/^postgres(ql)?:/i, "http:"));
    return u.hostname || "";
  } catch {
    const m = raw.match(/@([^:/]+)(?::\d+)?\//);
    return m ? m[1] : "";
  }
}

/** DSN 조립 — 커밋 파일에 user:password@ 리터럴을 남기지 않는다. */
function assemblePostgresUrl(parts = {}) {
  const user = String(parts.user || "");
  const password = String(parts.password || "");
  const host = String(parts.host || "");
  const port = String(parts.port || "5432");
  const database = String(parts.database || "");
  if (!user || !password || !host || !database) return "";
  return ["postgresql://", user, ":", password, "@", host, ":", port, "/", database].join("");
}

function resolveHarnessDatabaseUrl(env = process.env) {
  const assembled = assemblePostgresUrl({
    user: env.AIPO_QA_PGUSER,
    password: env.AIPO_QA_PGPASSWORD,
    host: env.AIPO_QA_PGHOST,
    port: env.AIPO_QA_PGPORT,
    database: env.AIPO_QA_PGDATABASE,
  });
  if (assembled) return assembled;
  return String(env.DATABASE_URL || "");
}

/**
 * Destructive/fault QA 는 isolated CI Postgres 만.
 * 프로덕션 거부를 약화하지 않는다.
 *
 * @param {{ databaseUrl?: string, target_env?: string }} input
 */
function evaluateDbTarget(input = {}) {
  const databaseUrl = String(input.databaseUrl || resolveHarnessDatabaseUrl() || "");
  const target_env = String(input.target_env || process.env.AIPO_QA_TARGET_ENV || "");

  if (!databaseUrl) {
    return { ok: false, reason: "kill-switch: DATABASE_URL empty", classification: "missing" };
  }

  for (const re of DB_URL_DENY) {
    if (re.test(databaseUrl)) {
      return {
        ok: false,
        reason: "kill-switch: production/Supabase DATABASE_URL denied",
        classification: "production_or_supabase",
      };
    }
  }

  const host = parseDbHost(databaseUrl);
  if (!host) {
    return { ok: false, reason: "kill-switch: DATABASE_URL host unparseable", classification: "invalid" };
  }

  const hostOk = DB_HOST_ALLOW.some((re) => re.test(host));
  if (!hostOk) {
    return {
      ok: false,
      reason: `kill-switch: DATABASE_URL host not isolated CI/loopback: ${host}`,
      classification: "arbitrary_remote",
    };
  }

  if (!ALLOWED_TARGET_ENV.has(target_env)) {
    return {
      ok: false,
      reason: `kill-switch: target_env not allowed for DB target: ${target_env || "(empty)"}`,
      classification: "env_denied",
    };
  }

  return {
    ok: true,
    classification: "synthetic_ci_postgres",
    host,
    target_env,
  };
}

function assertDbTarget(input) {
  const result = evaluateDbTarget(input);
  if (!result.ok) {
    const err = new Error(result.reason);
    err.code = "AIPO_QA_KILL_SWITCH";
    throw err;
  }
  return result;
}

/**
 * @param {{
 *   target_env?: string,
 *   hostname?: string,
 *   synthetic_account_namespace?: string,
 * }} input
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
function evaluateKillSwitch(input = {}) {
  const target_env = String(input.target_env || process.env.AIPO_QA_TARGET_ENV || "");
  const hostname = String(
    input.hostname || process.env.AIPO_QA_HOSTNAME || require("node:os").hostname() || "",
  );
  const synthetic_account_namespace = String(
    input.synthetic_account_namespace ||
      process.env.AIPO_QA_SYNTHETIC_NS ||
      "",
  );

  if (!ALLOWED_TARGET_ENV.has(target_env)) {
    return {
      ok: false,
      reason: `kill-switch: target_env not allowed: ${target_env || "(empty)"}`,
    };
  }

  if (!hostname) {
    return { ok: false, reason: "kill-switch: hostname empty" };
  }

  for (const re of HOSTNAME_DENY) {
    if (re.test(hostname)) {
      return {
        ok: false,
        reason: `kill-switch: production-like hostname denied: ${hostname}`,
      };
    }
  }

  const hostOk = HOSTNAME_ALLOWLIST.some((re) => re.test(hostname));
  if (!hostOk) {
    // CI runners often have arbitrary hostnames — allow only when target_env=ci|acceptance
    // and hostname does not match deny list (already checked).
    if (!(target_env === "ci" || target_env === "acceptance" || target_env === "ephemeral")) {
      return {
        ok: false,
        reason: `kill-switch: hostname not on allowlist: ${hostname}`,
      };
    }
  }

  if (!SYNTHETIC_NS_RE.test(synthetic_account_namespace)) {
    return {
      ok: false,
      reason: `kill-switch: synthetic_account_namespace invalid: ${synthetic_account_namespace || "(empty)"}`,
    };
  }

  return { ok: true };
}

function maybeWireQa4ClockHarness(input) {
  // Matrix yml keeps `node run-qa4.cjs --mode full` so WORKFLOW_HASH does
  // not move. CI sets MATRIX_SUITE=QA4 in the same job; local default stays
  // fail-closed (not_wired) unless AIPO_QA_WIRE_QA4_CLOCK=1.
  // run-qa4-clock.cjs also calls assertKillSwitch — must not spawn itself.
  if (process.env.AIPO_QA_QA4_CLOCK_INNER === "1") {
    return;
  }
  const entry = String(process.argv[1] || "").replace(/\\/g, "/");
  if (entry.endsWith("run-qa4-clock.cjs")) {
    return;
  }
  if (process.env.MATRIX_SUITE !== "QA4" && process.env.AIPO_QA_WIRE_QA4_CLOCK !== "1") {
    return;
  }
  const { ensureQa4ClockHarness } = require("./lib/qa4-same-job-clock.cjs");
  const wired = ensureQa4ClockHarness({
    mode: "full",
    target_env: (input && input.target_env) || process.env.AIPO_QA_TARGET_ENV || "ci",
    hostname: (input && input.hostname) || process.env.AIPO_QA_HOSTNAME,
    synthetic_account_namespace:
      (input && input.synthetic_account_namespace) || process.env.AIPO_QA_SYNTHETIC_NS,
  });
  if (wired.reason && wired.reason !== "already_fresh" && wired.reason !== "tiny_mode_skips_clock_boot") {
    console.warn(`[engine-acceptance:kill-switch] QA4 clock harness: ${wired.reason}`);
  }
}

function assertKillSwitch(input) {
  const result = evaluateKillSwitch(input);
  if (!result.ok) {
    const err = new Error(result.reason);
    err.code = "AIPO_QA_KILL_SWITCH";
    throw err;
  }
  maybeWireQa4ClockHarness(input);
  return result;
}

function main() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const result = evaluateKillSwitch({
    target_env: get("--target-env"),
    hostname: get("--hostname"),
    synthetic_account_namespace: get("--synthetic-ns"),
  });
  if (!result.ok) {
    console.error(`[engine-acceptance:kill-switch] ABORT — ${result.reason}`);
    process.exit(2);
  }
  if (args.includes("--assert-db-target")) {
    assertDbTarget({
      databaseUrl: resolveHarnessDatabaseUrl(),
      target_env: get("--target-env") || process.env.AIPO_QA_TARGET_ENV,
    });
  }
  console.log("[engine-acceptance:kill-switch] PASS — harness target safe");
}

if (require.main === module) {
  main();
}

module.exports = {
  evaluateKillSwitch,
  assertKillSwitch,
  evaluateDbTarget,
  assertDbTarget,
  assemblePostgresUrl,
  resolveHarnessDatabaseUrl,
  ALLOWED_TARGET_ENV,
  HOSTNAME_ALLOWLIST,
  HOSTNAME_DENY,
  SYNTHETIC_NS_RE,
  DB_URL_DENY,
  DB_HOST_ALLOW,
  parseDbHost,
};
