/**
 * QA8 adversarial case catalog — booted Nest HTTP only.
 * 현재 AdminGuard 미구현 → P0 를 정직하게 재현. fake PASS 금지.
 */
"use strict";

const { API_PREFIX } = require("./admin-route-inventory.cjs");

const LEDGER_JOURNALS = `${API_PREFIX}/ledger/journals`;
const LEDGER_BUCKETS_B = `${API_PREFIX}/users/22222222-2222-4222-8222-222222222222/buckets`;
const BALANCE_ADJUST_B = `${API_PREFIX}/users/22222222-2222-4222-8222-222222222222/balance-adjust`;
const USER_WALLET = "/api/v1/wallet/buckets";
const USER_SESSION = "/api/v1/auth/session";

/**
 * expected_current:
 *  - product_open_admin = 현재 Admin 무가드이면 2xx 가 "성공"이 아니라 P0 재현
 *  - deferred_until_admin_guard = 수리 후 활성화
 */
const CASES = Object.freeze([
  {
    id: "ADV-ADMIN-NO-TOKEN",
    method: "GET",
    path: LEDGER_JOURNALS,
    identity: "none",
    surface: "admin",
    expect_after_repair: { status: 401 },
    expected_current: "product_open_admin",
    canonical_defect: "QA8_ADMIN_BOUNDARY",
    assertion: "unauthenticated admin must not succeed",
  },
  {
    id: "ADV-ADMIN-INVALID-SIG",
    method: "GET",
    path: LEDGER_JOURNALS,
    identity: "invalid_signature",
    surface: "admin",
    expect_after_repair: { status: 401 },
    expected_current: "product_open_admin",
    canonical_defect: "QA8_ADMIN_BOUNDARY",
    assertion: "invalid signature must not access admin",
  },
  {
    id: "ADV-ADMIN-EXPIRED",
    method: "GET",
    path: LEDGER_JOURNALS,
    identity: "expired",
    surface: "admin",
    expect_after_repair: { status: 401 },
    expected_current: "product_open_admin",
    canonical_defect: "QA8_ADMIN_BOUNDARY",
    assertion: "expired token must not access admin",
  },
  {
    id: "ADV-ADMIN-ALG-NONE",
    method: "GET",
    path: LEDGER_JOURNALS,
    identity: "alg_none",
    surface: "admin",
    expect_after_repair: { status: 401 },
    expected_current: "product_open_admin",
    canonical_defect: "QA8_ADMIN_BOUNDARY",
    assertion: "alg=none must not access admin",
  },
  {
    id: "ADV-ADMIN-USER-JWT",
    method: "GET",
    path: LEDGER_JOURNALS,
    identity: "user_a",
    surface: "admin",
    expect_after_repair: { status: 401 },
    expected_current: "product_open_admin",
    canonical_defect: "QA8_ADMIN_BOUNDARY",
    assertion: "user JWT must not access admin",
  },
  {
    id: "ADV-ADMIN-WRONG-ISSUER",
    method: "GET",
    path: LEDGER_JOURNALS,
    identity: "wrong_issuer",
    surface: "admin",
    expect_after_repair: { status: 401 },
    expected_current: "product_open_admin",
    canonical_defect: "QA8_ADMIN_BOUNDARY",
    assertion: "wrong issuer must not access admin",
  },
  {
    id: "ADV-ADMIN-WRONG-AUDIENCE",
    method: "GET",
    path: LEDGER_JOURNALS,
    identity: "wrong_audience",
    surface: "admin",
    expect_after_repair: { status: 401 },
    expected_current: "product_open_admin",
    canonical_defect: "QA8_ADMIN_BOUNDARY",
    assertion: "wrong audience must not access admin",
  },
  {
    id: "ADV-ADMIN-ROLE-ESCALATION",
    method: "GET",
    path: LEDGER_JOURNALS,
    identity: "role_escalation_user_as_admin",
    surface: "admin",
    expect_after_repair: { status: 401 },
    expected_current: "product_open_admin",
    canonical_defect: "QA8_ADMIN_BOUNDARY",
    assertion: "user token must not escalate to admin",
  },
  {
    id: "ADV-ADMIN-CROSS-USER-BUCKETS",
    method: "GET",
    path: LEDGER_BUCKETS_B,
    identity: "user_a",
    surface: "admin",
    expect_after_repair: { status: 401 },
    expected_current: "product_open_admin",
    canonical_defect: "QA8_ADMIN_BOUNDARY",
    assertion: "user A must not read user B via admin buckets",
  },
  {
    id: "ADV-ADMIN-PATH-SLASH-BYPASS",
    method: "GET",
    path: "/api/v1/admin/ledger/journals/",
    identity: "none",
    surface: "admin",
    expect_after_repair: { status: 401 },
    expected_current: "product_open_admin",
    canonical_defect: "QA8_ADMIN_BOUNDARY",
    assertion: "trailing-slash admin path still protected",
  },
  {
    id: "ADV-ADMIN-PATH-DOT-BYPASS",
    method: "GET",
    path: "/api/v1/Admin/ledger/journals",
    identity: "none",
    surface: "admin",
    expect_after_repair: { status_in: [401, 404] },
    expected_current: "observe",
    assertion: "case-shift admin prefix must not skip auth",
  },
  {
    id: "ADV-ADMIN-MALFORMED-HEADER",
    method: "GET",
    path: LEDGER_JOURNALS,
    identity: "malformed_header",
    surface: "admin",
    expect_after_repair: { status: 401 },
    expected_current: "product_open_admin",
    canonical_defect: "QA8_ADMIN_BOUNDARY",
    assertion: "malformed Authorization must not access admin",
  },
  {
    id: "ADV-ADMIN-BALANCE-ADJUST-NO-TOKEN",
    method: "POST",
    path: BALANCE_ADJUST_B,
    identity: "none",
    surface: "admin",
    body: { bucket: "profit", kind: "credit", amountUsdt: "1", reason: "qa-synth", idempotencyKey: "qa-synth-no" },
    expect_after_repair: { status: 401 },
    expected_current: "product_open_admin",
    canonical_defect: "QA8_ADMIN_BOUNDARY",
    assertion: "unauthenticated balance-adjust must fail",
    destructive: true,
    skip_body_on_open: true,
  },
  {
    id: "ADV-USER-CROSS-WALLET",
    method: "GET",
    path: USER_WALLET,
    identity: "user_a",
    surface: "user",
    expect_after_repair: { status_in: [200, 404] },
    expected_current: "user_guarded",
    assertion: "user A wallet uses JWT subject only",
  },
  {
    id: "ADV-USER-SESSION-B-TOKEN",
    method: "GET",
    path: USER_SESSION,
    identity: "user_b",
    surface: "user",
    expect_after_repair: { status: 200 },
    expected_current: "user_guarded",
    assertion: "user B session is B not A",
  },
  {
    id: "ADV-ADMIN-VALID-ADMIN-DEFERRED",
    method: "GET",
    path: LEDGER_JOURNALS,
    identity: "admin",
    surface: "admin",
    expect_after_repair: { status: 200 },
    expected_current: "deferred_until_admin_guard",
    assertion: "valid admin permitted after AdminGuard repair",
  },
  {
    id: "ADV-ADMIN-WRONG-CAPABILITY-DEFERRED",
    method: "POST",
    path: BALANCE_ADJUST_B,
    identity: "admin",
    surface: "admin",
    expect_after_repair: { status: 403 },
    expected_current: "deferred_until_admin_guard",
    assertion: "valid admin wrong capability -> 403 after RBAC",
  },
  {
    id: "ADV-ADMIN-OPERATOR-FROM-TOKEN-DEFERRED",
    method: "POST",
    path: BALANCE_ADJUST_B,
    identity: "admin",
    surface: "admin",
    expect_after_repair: { operator_from: "token" },
    expected_current: "deferred_until_admin_guard",
    assertion: "audit operator identity equals token, not body",
  },
]);

function casesForInventoryCoverage() {
  return CASES.filter((c) => c.surface === "admin").map((c) => ({
    method: c.method,
    path: c.path,
    path_prefix: API_PREFIX,
  }));
}

module.exports = {
  CASES,
  casesForInventoryCoverage,
  LEDGER_JOURNALS,
};
