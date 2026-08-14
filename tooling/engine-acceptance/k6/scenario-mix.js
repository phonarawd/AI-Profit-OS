/**
 * QA-6 k6 scenario mix (CI heavy + measurement-only).
 *
 * Canonical QA6 (UNSPECIFIED_PERF_BUDGET, measurement-only 아님):
 *   수치 SLO 창작 금지 → fail-closed (기존 계약 유지).
 *
 * Measurement-only (AIPO_QA_MEASUREMENT_ONLY=1):
 *   실제 Nest 경로로 부하를 넣고 p50/p95/p99/error-rate 를 기록한다.
 *   threshold 없음 · NON-VERDICT · canonical QA6 PASS 로 오인 금지.
 *
 * 경로 SSOT = tooling/engine-acceptance/k6/route-catalog.cjs
 * (k6 Goja 는 require 불가 → 이 파일에 동일 경로를 둔다. selftest가 교차검증.)
 */
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.AIPO_QA_BASE_URL || "http://127.0.0.1:4000";
const BUDGET_STATUS = __ENV.AIPO_QA_PERF_BUDGET_STATUS || "UNSPECIFIED_PERF_BUDGET";
const SYNTH_NS = __ENV.AIPO_QA_SYNTHETIC_NS || "qa-synth-ci";
const MEASUREMENT_ONLY = __ENV.AIPO_QA_MEASUREMENT_ONLY === "1";
const AUTH_HEADER = __ENV.AIPO_QA_USER_BEARER || "";

const ROUTES = {
  feed_read: "/api/v1/me/home-read",
  participate: "/api/v1/opportunities",
  wallet_read: "/api/v1/wallet/buckets",
  auth_profile: "/api/v1/auth/session",
  health_public: "/api/v1/health",
};

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

function authHeaders() {
  const headers = { "X-AIPO-QA-NS": SYNTH_NS };
  if (AUTH_HEADER) headers.Authorization = AUTH_HEADER;
  return headers;
}

const unspecified = BUDGET_STATUS === "UNSPECIFIED_PERF_BUDGET";
const thresholds = unspecified ? {} : buildThresholds();
const hasAnyThreshold = Object.keys(thresholds).length > 0;

const measurementScenarios = {
  feed_read: {
    executor: "constant-vus",
    vus: 2,
    duration: "20s",
    exec: "feedRead",
    tags: { scenario: "feed_read", synthetic_ns: SYNTH_NS },
  },
  participate: {
    executor: "constant-vus",
    vus: 1,
    duration: "20s",
    exec: "opportunitiesRead",
    tags: { scenario: "participate", synthetic_ns: SYNTH_NS },
  },
  wallet_read: {
    executor: "constant-vus",
    vus: 1,
    duration: "20s",
    exec: "walletRead",
    tags: { scenario: "wallet_read", synthetic_ns: SYNTH_NS },
  },
  auth_profile: {
    executor: "constant-vus",
    vus: 1,
    duration: "20s",
    exec: "authProfile",
    tags: { scenario: "auth_profile", synthetic_ns: SYNTH_NS },
  },
  health_public: {
    executor: "constant-vus",
    vus: 1,
    duration: "20s",
    exec: "healthPublic",
    tags: { scenario: "health_public", synthetic_ns: SYNTH_NS },
  },
};

export const options = MEASUREMENT_ONLY
  ? {
      scenarios: measurementScenarios,
      thresholds: {},
    }
  : unspecified || !hasAnyThreshold
    ? {
        vus: 1,
        duration: "1s",
        thresholds: {
          checks: ["rate==2"],
        },
      }
    : {
        scenarios: {
          feed_read: measurementScenarios.feed_read,
          participate: measurementScenarios.participate,
          wallet_read: measurementScenarios.wallet_read,
          auth_profile: measurementScenarios.auth_profile,
        },
        thresholds,
      };

export function setup() {
  if (MEASUREMENT_ONLY) {
    return {
      ok: true,
      mode: "MEASUREMENT_ONLY",
      verdict: "NON_VERDICT",
      budget_status: BUDGET_STATUS,
    };
  }
  if (unspecified || !hasAnyThreshold) {
    throw new Error(
      "UNSPECIFIED_PERF_BUDGET — refusing to invent p95/error_rate thresholds (QA-6)",
    );
  }
  return { ok: true };
}

// Diagnostic-only, throttled to one log line per tag per process — never
// affects the threshold verdict, only helps root-cause a real failure.
const loggedFailureForTag = {};
function logFirstFailure(tag, res) {
  if (res.status >= 200 && res.status < 400) return;
  if (loggedFailureForTag[tag]) return;
  loggedFailureForTag[tag] = true;
  console.log(
    `[scenario-mix] first non-2xx for ${tag}: status=${res.status} body=${String(res.body || "").slice(0, 300)}`,
  );
}

export function feedRead() {
  const res = http.get(`${BASE}${ROUTES.feed_read}`, {
    tags: { scenario: "feed_read" },
    headers: authHeaders(),
  });
  logFirstFailure("feed_read", res);
  check(res, { "feed status handled": (r) => r.status > 0 });
  sleep(0.2);
}

export function opportunitiesRead() {
  const res = http.get(`${BASE}${ROUTES.participate}`, {
    tags: { scenario: "participate" },
    headers: authHeaders(),
  });
  logFirstFailure("participate", res);
  check(res, { "opportunities read status handled": (r) => r.status > 0 });
  sleep(0.3);
}

/** 구 이름 호환 — 실제로는 읽기 전용 opportunities GET */
export function participate() {
  opportunitiesRead();
}

export function walletRead() {
  const res = http.get(`${BASE}${ROUTES.wallet_read}`, {
    tags: { scenario: "wallet_read" },
    headers: authHeaders(),
  });
  logFirstFailure("wallet_read", res);
  check(res, { "wallet status handled": (r) => r.status > 0 });
  sleep(0.2);
}

export function authProfile() {
  const res = http.get(`${BASE}${ROUTES.auth_profile}`, {
    tags: { scenario: "auth_profile" },
    headers: authHeaders(),
  });
  logFirstFailure("auth_profile", res);
  check(res, { "auth status handled": (r) => r.status > 0 });
  sleep(0.2);
}

export function healthPublic() {
  const res = http.get(`${BASE}${ROUTES.health_public}`, {
    tags: { scenario: "health_public" },
    headers: { "X-AIPO-QA-NS": SYNTH_NS },
  });
  check(res, { "health status handled": (r) => r.status > 0 });
  sleep(0.2);
}

export default function () {
  if (MEASUREMENT_ONLY) {
    healthPublic();
    return;
  }
  check(null, { "must not invent thresholds": () => false });
}
