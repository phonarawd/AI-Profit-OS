/**
 * QA-6 k6 scenario mix (CI heavy only).
 *
 * Threshold numbers MUST be injected via env from product SLO sources.
 * If AIPO_QA_PERF_BUDGET_STATUS=UNSPECIFIED_PERF_BUDGET (default), this
 * script refuses to invent p95/error_rate and fails closed.
 *
 * Local tiny smoke does not execute this file — mechanism check only.
 */
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.AIPO_QA_BASE_URL || "http://127.0.0.1:9";
const BUDGET_STATUS = __ENV.AIPO_QA_PERF_BUDGET_STATUS || "UNSPECIFIED_PERF_BUDGET";
const SYNTH_NS = __ENV.AIPO_QA_SYNTHETIC_NS || "qa-synth-ci";

function parseThreshold(envKey) {
  const raw = __ENV[envKey];
  if (raw === undefined || raw === null || raw === "" || raw === "null") {
    return null;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function buildThresholds() {
  const out = {};
  const tags = [
    ["feed_read", "FEED_READ"],
    ["participate", "PARTICIPATE"],
    ["wallet_read", "WALLET_READ"],
    ["auth_profile", "AUTH_PROFILE"],
  ];
  for (const [tag, env] of tags) {
    const p95 = parseThreshold(`AIPO_QA_THRESH_${env}_P95_MS`);
    const err = parseThreshold(`AIPO_QA_THRESH_${env}_ERROR_RATE`);
    if (p95 !== null) {
      out[`http_req_duration{scenario:${tag}}`] = [`p(95)<${p95}`];
    }
    if (err !== null) {
      out[`http_req_failed{scenario:${tag}}`] = [`rate<${err}`];
    }
  }
  return out;
}

const unspecified = BUDGET_STATUS === "UNSPECIFIED_PERF_BUDGET";
const thresholds = unspecified ? {} : buildThresholds();
const hasAnyThreshold = Object.keys(thresholds).length > 0;

export const options = unspecified || !hasAnyThreshold
  ? {
      // fail-closed: no invented thresholds, no laundry PASS
      vus: 1,
      duration: "1s",
      thresholds: {
        checks: ["rate==2"],
      },
    }
  : {
      scenarios: {
        feed_read: {
          executor: "constant-vus",
          vus: 2,
          duration: "30s",
          exec: "feedRead",
          tags: { scenario: "feed_read", synthetic_ns: SYNTH_NS },
        },
        participate: {
          executor: "constant-vus",
          vus: 1,
          duration: "30s",
          exec: "participate",
          tags: { scenario: "participate", synthetic_ns: SYNTH_NS },
        },
        wallet_read: {
          executor: "constant-vus",
          vus: 1,
          duration: "30s",
          exec: "walletRead",
          tags: { scenario: "wallet_read", synthetic_ns: SYNTH_NS },
        },
        auth_profile: {
          executor: "constant-vus",
          vus: 1,
          duration: "30s",
          exec: "authProfile",
          tags: { scenario: "auth_profile", synthetic_ns: SYNTH_NS },
        },
      },
      thresholds,
    };

export function setup() {
  if (unspecified || !hasAnyThreshold) {
    throw new Error(
      "UNSPECIFIED_PERF_BUDGET — refusing to invent p95/error_rate thresholds (QA-6)",
    );
  }
  return { ok: true };
}

export function feedRead() {
  const res = http.get(`${BASE}/v1/feed`, {
    tags: { scenario: "feed_read" },
    headers: { "X-AIPO-QA-NS": SYNTH_NS },
  });
  check(res, { "feed status handled": (r) => r.status > 0 });
  sleep(0.2);
}

export function participate() {
  const res = http.get(`${BASE}/v1/opportunities`, {
    tags: { scenario: "participate" },
    headers: { "X-AIPO-QA-NS": SYNTH_NS },
  });
  check(res, { "participate status handled": (r) => r.status > 0 });
  sleep(0.3);
}

export function walletRead() {
  const res = http.get(`${BASE}/v1/wallet`, {
    tags: { scenario: "wallet_read" },
    headers: { "X-AIPO-QA-NS": SYNTH_NS },
  });
  check(res, { "wallet status handled": (r) => r.status > 0 });
  sleep(0.2);
}

export function authProfile() {
  const res = http.get(`${BASE}/v1/me`, {
    tags: { scenario: "auth_profile" },
    headers: { "X-AIPO-QA-NS": SYNTH_NS },
  });
  check(res, { "auth status handled": (r) => r.status > 0 });
  sleep(0.2);
}

export default function () {
  // used only in unspecified fail-closed path
  check(null, { "must not invent thresholds": () => false });
}
