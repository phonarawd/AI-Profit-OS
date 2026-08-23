# REL-502 FINAL ENGINE ACCEPTANCE

이 문서는 REL-004 sanity 와 별도다. REL-004 로 대체 금지.

```text
REL = REL-502
TITLE = FINAL ENGINE ACCEPTANCE
STATUS = NOT_ISSUED
CERT_ISSUED = 0
REL-004_SUBSTITUTE = 0
QA9_PREDECESSOR_VERDICT_AS_CURRENT = 0
PSM_REL_PENDING = 0
POST_PSM_PENDING = 3
PROTECTED_SCOPE_DRIFT = 0
REBASE_REQUIRED = 0
REBASE_APPLIED = 1
ACK_RECEIVED = 1
LOCAL_QA0_QA9_RERUN = 0
EVAL_DATASET_STATUS = ACKNOWLEDGED_EXPANSION
QA1_QA8_STATUS = COMPLETE_CURRENT_EPOCH
QA9_STATUS = COMPLETE_NOT_ACCEPTED
QA9_VERDICT = ENGINE_NOT_ACCEPTED
DEFECTS_P0 = 0
DEFECTS_P1 = 12
CRITICAL_INVARIANT_BLOCKED = 2
NEXT = 03_blocked_fix_round
BASELINE_ID = ea-baseline-a6908eff1def-3db9e8f8832f
PREDECESSOR_BASELINE_ID = ea-baseline-64b0f8a6d984-3657543f36b5
REBASE_ID = ea-rebase-a6908eff1def-3db9e8f8832f
LIVE_AGGREGATE = 3db9e8f8832f62ed0527e9eea7622944098fff5b9b66d8a0318953ceb58f7a65
BASELINE_AGGREGATE = 3db9e8f8832f62ed0527e9eea7622944098fff5b9b66d8a0318953ceb58f7a65
PATH_COUNT_LIVE = 443
PATH_COUNT_BASELINE = 443
CHANGED_PATHS = 0
ADDED_PATHS = 0
MUTATED_PATHS = 0
MISSING_PATHS = 0
EXIT_GATE = 이후 PSM=TRUE 작업이 생기면 인증 무효 → 재실행
```

## 판정

Human/PO ACK `ENGINE_ACCEPTANCE_REBASE_V1` 수신 · apply 완료.
새 epoch `ea-baseline-a6908eff1def-3db9e8f8832f` 가 live protected-scope 를 pin 한다.
2026-08-14 QA9 `ENGINE_ACCEPTED_FOR_UI` 는 predecessor epoch 결과이며 current-authoritative 가 아니다.
`qa9_predecessor_verdict_as_current_authoritative = FORBIDDEN`.

현재 epoch QA1-QA8 재실행 + QA9 재집계를 완료했다.
- QA1-QA3 · QA7(CI Actions `32634726715` formal 26/26) COMPLETE
- QA4 full: P1=6 — clock hook 있음 · harness multi-day executor 미배선 (FAIL, laundry PASS 금지)
- QA5 full: P1=6 — fault hook 있음 · Failure World executor 미배선 (FAIL, laundry PASS 금지)
- QA6+QA8: `critical_invariant.blocked=2` (`BLOCKED_ENV_CAPABILITY`)
- QA9 공식: `ENGINE_NOT_ACCEPTED` · `ENGINE_ACCEPTED_FOR_UI=NOT_ISSUED` · NEXT=`03_blocked_fix_round`

인증서를 발급하지 않는다. 제품 mutation 으로 초록을 쫓지 않는다.
로컬에서 QA0-QA9 를 가짜 PASS 로 닫지 않았다.
eval 은 `ACKNOWLEDGED_EXPANSION` 이며 QA7 케이스 수는 live dataset(26)이다.

## PSM 수집 (고정 range 아님)

플랜 YAML 에서 `PROTECTED_SCOPE_MUTATION: true` 인 `REL-*` 만 수집한다.

COMPLETED: REL-003 · REL-008 · REL-010 · REL-015 · REL-016 · REL-020 · REL-021 · REL-022 · REL-222 · REL-223 · REL-224 · REL-401 · REL-405 · REL-406 · REL-407 · REL-408

명시 비-PSM 의존: REL-004 · REL-501 (둘 다 COMPLETED)

POST-001 · POST-002 · POST-003 은 PSM=TRUE 이지만 실행 순서가 REL-502 이후다. 인증 발급을 막지 않는다. 이후 실행되면 REL-503 이 이 인증을 STALE 로 만든다.

## 발급 조건 (4·5 미충족)

1. PSM=TRUE REL 미완료 0 — 충족
2. live aggregate == current baseline aggregate — 충족
3. QA1-QA8 COMPLETE on that baseline — 충족
4. QA9 가 현재 epoch 로 `ENGINE_ACCEPTED_FOR_UI` 재집계 — 미충족 (`ENGINE_NOT_ACCEPTED`, P1=12)
5. 이 문서 `STATUS = ISSUED` · `CERT_ISSUED = 1` — 미충족

## 변경 경로 (108 · predecessor 대비 이력 · 현재 epoch pin 이후 CHANGED_PATHS = 0)

### 추가 69

- eval/coach_redteam.jsonl
- eval/s_safe_refuse.jsonl
- schemas/admin-audit.v1.json
- schemas/admin-kill-switch.v1.json
- schemas/admin-match-control.v1.json
- schemas/admin-ops-mode.v1.json
- schemas/admin-policy-version.v1.json
- schemas/price-override-layers.v1.json
- schemas/push-channel-filter.v1.json
- schemas/push-kill.v1.json
- schemas/push-payload.v1.json
- schemas/push-subscription.v1.json
- services/api-nest/admin-audit.core.cjs
- services/api-nest/admin-kill-switch.core.cjs
- services/api-nest/admin-match-control.core.cjs
- services/api-nest/admin-ops.core.cjs
- services/api-nest/admin-policy-version.core.cjs
- services/api-nest/auth-rate-limit.cjs
- services/api-nest/ledger-user-query.core.cjs
- services/api-nest/price-override.core.cjs
- services/api-nest/src/admin-ops/admin-ops.admin.controller.ts
- services/api-nest/src/admin-ops/admin-ops.module.ts
- services/api-nest/src/admin-ops/admin-ops.routes.ts
- services/api-nest/src/admin-ops/admin-ops.service.ts
- services/api-nest/src/audit/admin-audit.module.ts
- services/api-nest/src/audit/admin-audit.service.ts
- services/api-nest/src/audit/audit-events.admin.controller.ts
- services/api-nest/src/audit/audit.routes.ts
- services/api-nest/src/auth/auth-rate-limit.guard.ts
- services/api-nest/src/auth/auth-rate-limit.selftest.ts
- services/api-nest/src/auth/webauthn-rp.ts
- services/api-nest/src/common/security-headers.middleware.ts
- services/api-nest/src/kill-switch/kill-switch.admin.controller.ts
- services/api-nest/src/kill-switch/kill-switch.module.ts
- services/api-nest/src/kill-switch/kill-switch.routes.ts
- services/api-nest/src/kill-switch/kill-switch.service.ts
- services/api-nest/src/ledger/ledger.user-query.selftest.ts
- services/api-nest/src/ledger/ledger.user-query.service.ts
- services/api-nest/src/ledger/ledger.user.controller.ts
- services/api-nest/src/match-control/match-control.admin.controller.ts
- services/api-nest/src/match-control/match-control.module.ts
- services/api-nest/src/match-control/match-control.routes.ts
- services/api-nest/src/match-control/match-control.service.ts
- services/api-nest/src/observability/obs.exception-filter.ts
- services/api-nest/src/opportunities/opportunity-reprice.service.ts
- services/api-nest/src/price-override/price-override.module.ts
- services/api-nest/src/price-override/price-override.service.ts
- services/api-nest/src/push/push-dispatch.client.ts
- services/api-nest/src/push/push-emit.service.ts
- services/api-nest/src/push/push-kill.admin.controller.ts
- services/api-nest/src/push/push-kill.service.ts
- services/api-nest/src/push/push-subscription.service.ts
- services/api-nest/src/push/push.module.ts
- services/api-nest/src/push/push.routes.ts
- services/api-nest/src/push/push.user.controller.ts
- services/api-nest/src/source-policy/source-policy.admin.controller.ts
- services/api-nest/src/source-policy/source-policy.module.ts
- services/api-nest/src/source-policy/source-policy.routes.ts
- services/api-nest/src/source-policy/source-policy.service.ts
- supabase/migrations/20260819210000_source_observations.sql
- supabase/migrations/20260819220000_canonical_products.sql
- supabase/migrations/20260820013000_match_results.sql
- supabase/migrations/20260821090000_push_subscriptions_and_control.sql
- supabase/migrations/20260823160000_admin_audit_events.sql
- supabase/migrations/20260823170000_admin_kill_switches.sql
- supabase/migrations/20260823180000_opportunity_price_overrides.sql
- supabase/migrations/20260823190000_admin_ops_intents.sql
- supabase/migrations/20260823200000_admin_match_controls.sql
- supabase/migrations/20260823210000_admin_policy_versions.sql

### 변경 39

- eval/g_scope_escape.jsonl
- schemas/admin-rbac.v1.json
- services/api-nest/src/ai/ai-logs.admin.service.ts
- services/api-nest/src/ai/ai.engine.ts
- services/api-nest/src/ai/coach.orchestrator.ts
- services/api-nest/src/app.module.ts
- services/api-nest/src/auth/auth.controller.ts
- services/api-nest/src/auth/auth.module.ts
- services/api-nest/src/auth/auth.service.ts
- services/api-nest/src/auth/privacy-account.service.ts
- services/api-nest/src/common/admin-capabilities.ts
- services/api-nest/src/common/admin.guard.ts
- services/api-nest/src/growth/growth.module.ts
- services/api-nest/src/growth/growth.public.controller.ts
- services/api-nest/src/inbox/index.ts
- services/api-nest/src/inbox/notification-prefs.defaults.ts
- services/api-nest/src/ledger/ledger.module.ts
- services/api-nest/src/ledger/ledger.routes.ts
- services/api-nest/src/main.ts
- services/api-nest/src/opportunities/catalog-runtime-seed.service.ts
- services/api-nest/src/opportunities/index.ts
- services/api-nest/src/opportunities/opportunities.admin.controller.ts
- services/api-nest/src/opportunities/opportunities.admin.service.ts
- services/api-nest/src/opportunities/opportunities.mi.ts
- services/api-nest/src/opportunities/opportunities.module.ts
- services/api-nest/src/opportunities/opportunities.routes.ts
- services/api-nest/src/opportunities/opportunities.types.ts
- services/api-nest/src/opportunities/opportunities.user.service.ts
- services/api-nest/src/referral/referral.module.ts
- services/api-nest/src/referral/referral.program.service.ts
- services/api-nest/src/risk/risk.module.ts
- services/api-nest/src/risk/risk.service.ts
- services/api-nest/src/trades/trades.execution.service.ts
- services/api-nest/src/trades/trades.user.controller.ts
- services/api-nest/src/trades/trades.user.routes.ts
- services/api-nest/src/wallet/deposit-address.service.ts
- services/api-nest/src/wallet/krw-deposit.service.ts
- services/api-nest/src/wallet/wallet.module.ts
- services/engine-rust/src/settlement_rule.rs
