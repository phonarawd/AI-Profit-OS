/**
 * QA_ENV_ISOLATION_GUARD — 금융 mutation이 프로덕션/공유 DB를 치지 못하게 fail-closed.
 * 시크릿 값은 로그하지 않는다.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../../..");
const ALLOWLIST_PATH = path.join(
  ROOT,
  "tooling/e2e/fixtures/qa-allowlist.v1.json",
);

const PRODUCTION_PROJECT_REF = "mgsytcetsiecllmhcyox";

function loadAllowlist() {
  const raw = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, "utf8"));
  if (raw.productionProjectRef !== PRODUCTION_PROJECT_REF) {
    throw new Error(
      "QA_ENV_ISOLATION_GUARD: allowlist productionProjectRef drift",
    );
  }
  return raw;
}

function redactUrl(url) {
  return String(url || "").replace(/:[^@/]+@/, ":[redacted]@");
}

function collectBlob(input) {
  return [
    input.databaseUrl || "",
    input.projectRef || "",
    input.host || "",
  ]
    .join("\n")
    .toLowerCase();
}

function parseHost(databaseUrl) {
  if (!databaseUrl) return "";
  try {
    const normalized = String(databaseUrl).replace(/^postgresql:/i, "http:");
    return new URL(normalized).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isProductionTarget(input, allowlist) {
  const blob = collectBlob(input);
  const deny = allowlist.productionDenySubstrings || [];
  if (deny.some((s) => s && blob.includes(String(s).toLowerCase()))) {
    return true;
  }
  return blob.includes(PRODUCTION_PROJECT_REF);
}

function isAllowlisted(input, allowlist) {
  const host = (input.host || parseHost(input.databaseUrl)).toLowerCase();
  const ref = String(input.projectRef || "").toLowerCase();
  const hosts = (allowlist.allowedHosts || []).map((h) => h.toLowerCase());
  const refs = (allowlist.allowedProjectRefs || []).map((r) => r.toLowerCase());
  if (host && hosts.includes(host)) return true;
  if (ref && refs.includes(ref)) return true;
  return false;
}

/**
 * @param {{
 *   purpose?: "qa" | "e2e" | "money_mutation",
 *   databaseUrl?: string,
 *   projectRef?: string,
 *   host?: string,
 * }} [opts]
 */
function assertQaIsolation(opts = {}) {
  const allowlist = loadAllowlist();
  const purpose = opts.purpose || "qa";
  const input = {
    databaseUrl:
      opts.databaseUrl ??
      process.env.QA_DATABASE_URL ??
      process.env.DATABASE_URL ??
      "",
    projectRef:
      opts.projectRef ??
      process.env.QA_SUPABASE_PROJECT_REF ??
      process.env.SUPABASE_PROJECT_REF ??
      "",
    host: opts.host || "",
  };

  if (isProductionTarget(input, allowlist)) {
    throw new Error(
      `QA_ENV_ISOLATION_GUARD: production project_ref/url denied (purpose=${purpose})`,
    );
  }

  if (purpose === "money_mutation") {
    if (!isAllowlisted(input, allowlist)) {
      throw new Error(
        "QA_ENV_ISOLATION_GUARD: money mutation fail-closed (target not allowlisted)",
      );
    }
  }

  return {
    ok: true,
    purpose,
    host: parseHost(input.databaseUrl) || input.host || "none",
  };
}

module.exports = {
  PRODUCTION_PROJECT_REF,
  ALLOWLIST_PATH,
  assertQaIsolation,
  isProductionTarget,
  isAllowlisted,
  loadAllowlist,
  redactUrl,
  parseHost,
};
