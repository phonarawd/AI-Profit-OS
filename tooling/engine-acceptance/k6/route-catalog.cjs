/**
 * QA6 k6 경로 카탈로그 — Nest 실라우트만 (글로벌 prefix api/v1).
 * k6 스크립트는 Goja 런타임이라 이 파일을 require 하지 못한다.
 * scenario-mix.js 의 ROUTES 와 바이트 단위로 맞추고 selftest가 교차검증한다.
 *
 * 파괴적 머니 mutate(participate POST / withdraw / balance-adjust) 는 측정 믹스에서 제외.
 */
"use strict";

const API_PREFIX = "/api/v1";

/** 과거 조사에서 발견된 유령 경로 — 재등장 금지 */
const PHANTOM_PATHS = Object.freeze([
  "/v1/feed",
  "/v1/opportunities",
  "/v1/wallet",
  "/v1/me",
]);

const DESTRUCTIVE_PATHS = Object.freeze([
  `${API_PREFIX}/opportunities/:id/participate`,
  `${API_PREFIX}/opportunities/:id/preflight`,
  `${API_PREFIX}/wallet/withdraw`,
  `${API_PREFIX}/wallet/profit/merge`,
  `${API_PREFIX}/admin/users/:userId/balance-adjust`,
  `${API_PREFIX}/auth/delete-account`,
]);

/**
 * tag 는 기존 perf-budget.v1.json threshold_mechanism 바인딩을 유지한다.
 * 실제 HTTP 는 읽기/경량만.
 */
const SCENARIOS = Object.freeze([
  {
    scenario_id: "PERF-FEED-READ",
    tag: "feed_read",
    exec: "feedRead",
    method: "GET",
    path: `${API_PREFIX}/me/home-read`,
    auth: "authenticated_user",
    classification: "authenticated_user",
    suitable_for_perf_baseline: true,
    destructive: false,
    title: "HomeRead 읽기 (구 /v1/feed 유령 경로 대체)",
  },
  {
    scenario_id: "PERF-PARTICIPATE",
    tag: "participate",
    exec: "opportunitiesRead",
    method: "GET",
    path: `${API_PREFIX}/opportunities`,
    auth: "authenticated_user",
    classification: "authenticated_user",
    suitable_for_perf_baseline: true,
    destructive: false,
    title: "기회 목록 읽기 — POST participate 는 측정 제외",
  },
  {
    scenario_id: "PERF-WALLET-READ",
    tag: "wallet_read",
    exec: "walletRead",
    method: "GET",
    path: `${API_PREFIX}/wallet/buckets`,
    auth: "authenticated_user",
    classification: "authenticated_user",
    suitable_for_perf_baseline: true,
    destructive: false,
    title: "지갑 버킷 읽기 (구 /v1/wallet 유령 경로 대체)",
  },
  {
    scenario_id: "PERF-AUTH-PROFILE",
    tag: "auth_profile",
    exec: "authProfile",
    method: "GET",
    path: `${API_PREFIX}/auth/session`,
    auth: "authenticated_user",
    classification: "authenticated_user",
    suitable_for_perf_baseline: true,
    destructive: false,
    title: "세션 읽기 (구 /v1/me 유령 경로 대체)",
  },
  {
    scenario_id: "PERF-HEALTH-PUBLIC",
    tag: "health_public",
    exec: "healthPublic",
    method: "GET",
    path: `${API_PREFIX}/health`,
    auth: "public",
    classification: "public",
    suitable_for_perf_baseline: true,
    destructive: false,
    measurement_only_extra: true,
    title: "헬스 공개 읽기 — measurement-only 추가 시나리오",
  },
]);

const UNSUITABLE_FOR_BASELINE = Object.freeze([
  {
    path: `${API_PREFIX}/opportunities/:id/participate`,
    reason: "money-changing participate",
  },
  {
    path: `${API_PREFIX}/wallet/withdraw`,
    reason: "money-changing withdraw",
  },
  {
    path: `${API_PREFIX}/admin/users/:userId/balance-adjust`,
    reason: "admin money mutation",
  },
]);

module.exports = {
  API_PREFIX,
  PHANTOM_PATHS,
  DESTRUCTIVE_PATHS,
  SCENARIOS,
  UNSUITABLE_FOR_BASELINE,
};
