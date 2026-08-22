/**
 * Isolated QA harness DB capability probe — 연결/마이그레이션 0.
 *
 * resolveHarnessDatabaseUrl + kill-switch evaluateDbTarget 만 본다.
 * 프로덕션/Supabase DSN 을 읽어서 쓰지 않는다 (deny list).
 */
"use strict";

const { execFileSync } = require("node:child_process");
const {
  resolveHarnessDatabaseUrl,
  evaluateDbTarget,
} = require("../kill-switch.cjs");

function probeDockerAvailable() {
  try {
    execFileSync("docker", ["info"], {
      encoding: "utf8",
      timeout: 8_000,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * @param {{
 *   requireDocker?: boolean,
 *   target_env?: string,
 *   env?: NodeJS.ProcessEnv,
 * }} [opts]
 */
function probeIsolatedHarnessCapability(opts = {}) {
  const env = opts.env || process.env;
  const requireDocker = opts.requireDocker === true;
  const databaseUrl = resolveHarnessDatabaseUrl(env);
  const target_env = opts.target_env || env.AIPO_QA_TARGET_ENV || "local";

  const db = databaseUrl
    ? evaluateDbTarget({ databaseUrl, target_env })
    : {
        ok: false,
        reason: "no_isolated_dsn_configured",
        classification: "missing",
      };

  const docker =
    requireDocker && db.ok
      ? probeDockerAvailable()
      : requireDocker
        ? { ok: false, reason: "dsn_missing" }
        : null;
  const available = Boolean(db.ok) && (!requireDocker || Boolean(docker && docker.ok));

  let reason = null;
  if (!available) {
    if (!db.ok) reason = db.reason;
    else reason = "docker_unavailable";
  }

  return {
    available,
    dsn_configured: Boolean(databaseUrl),
    requireDocker,
    db,
    docker,
    reason,
  };
}

function collectBlockedCodes(scenarios, extra = []) {
  const set = new Set();
  for (const c of extra) {
    if (c) set.add(c);
  }
  for (const s of scenarios || []) {
    if (s && s.blocked_code) set.add(s.blocked_code);
  }
  return [...set];
}

module.exports = {
  probeIsolatedHarnessCapability,
  probeDockerAvailable,
  collectBlockedCodes,
};
