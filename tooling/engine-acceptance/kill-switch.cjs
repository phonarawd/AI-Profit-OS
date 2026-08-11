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

function assertKillSwitch(input) {
  const result = evaluateKillSwitch(input);
  if (!result.ok) {
    const err = new Error(result.reason);
    err.code = "AIPO_QA_KILL_SWITCH";
    throw err;
  }
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
  console.log("[engine-acceptance:kill-switch] PASS — harness target safe");
}

if (require.main === module) {
  main();
}

module.exports = {
  evaluateKillSwitch,
  assertKillSwitch,
  ALLOWED_TARGET_ENV,
  HOSTNAME_ALLOWLIST,
  HOSTNAME_DENY,
  SYNTHETIC_NS_RE,
};
