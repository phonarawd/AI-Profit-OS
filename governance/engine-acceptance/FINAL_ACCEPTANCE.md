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
PROTECTED_SCOPE_DRIFT = 1
REBASE_REQUIRED = 1
REBASE_APPLIED = 0
ACK_RECEIVED = 0
LOCAL_QA0_QA9_RERUN = 0
EVAL_DATASET_STATUS = MATCH
QA1_QA8_STATUS = STALE_PENDING_REBASE
QA9_STATUS = STALE_PENDING_REBASE
QA9_VERDICT = NOT_CURRENT
DEFECTS_P0 = 0
DEFECTS_P1 = 0
CRITICAL_INVARIANT_BLOCKED = 0
NEXT = ENGINE_ACCEPTANCE_REBASE_V1
BASELINE_ID = ea-baseline-04ef3c7de4dd-2ff1760b7d72
PREDECESSOR_BASELINE_ID = ea-baseline-229e7777f9b0-2d4567b3a2c8
REBASE_ID = pending
LIVE_AGGREGATE = 6764f60554ab3e703cfb416f98846ccbad5555eaa058a2917962f21a0be37f9a
BASELINE_AGGREGATE = 2ff1760b7d721205657991e1c775bf95fea4ae944dfb8e23a5b85de9813a36e8
PATH_COUNT_LIVE = 464
PATH_COUNT_BASELINE = 450
CHANGED_PATHS = 30
ADDED_PATHS = 14
MUTATED_PATHS = 16
MISSING_PATHS = 0
EXIT_GATE = P0-B Nest RENDER_GIT_COMMIT provenance · ENGINE_ACCEPTANCE_REBASE_V1 ACK 후 QA0-QA9 재실행 전까지 ISSUED 금지
```

## 판정

현재 integration은 baseline 이후 protected-scope 30경로(추가 14 · 변경 16)를 변경했다.
live aggregate ≠ baseline → 이전 ISSUED 인증은 current-authoritative 가 아니다.
은폐 금지 · `STATUS = NOT_ISSUED` · `CERT_ISSUED = 0` · `PROTECTED_SCOPE_DRIFT = 1` · `REBASE_REQUIRED = 1`.

변경 경로 (30):
- schemas/operator-entity.instance.json
- schemas/toast-codes.v1.json
- services/api-nest/src/auth/auth.controller.ts
- services/api-nest/src/auth/auth.module.ts
- services/api-nest/src/auth/auth.service.ts
- services/api-nest/src/auth/auth.stage.ts
- services/api-nest/src/auth/identity-proof.crypto.ts (added)
- services/api-nest/src/auth/identity-proof.email.runtime.test.ts (added)
- services/api-nest/src/auth/identity-proof.email.ts (added)
- services/api-nest/src/auth/identity-proof.selftest.ts (added)
- services/api-nest/src/auth/identity-proof.store.ts (added)
- services/api-nest/src/auth/magic-link.delivery.runtime.test.ts (added)
- services/api-nest/src/auth/magic-link.service.ts (added)
- services/api-nest/src/auth/oauth-identity.service.ts (added)
- services/api-nest/src/auth/passkey-registration.policy.ts (added)
- services/api-nest/src/auth/webauthn-assert.service.ts (added)
- services/api-nest/src/config/nest-provenance.ts (added)
- services/api-nest/src/health.controller.ts
- services/api-nest/src/wallet/deposit-address.service.ts
- services/api-nest/src/wallet/index.ts
- services/api-nest/src/wallet/resend-email.provider.ts
- services/api-nest/src/wallet/tron-address.runtime.test.ts (added)
- services/api-nest/src/wallet/tron-address.ts
- services/api-nest/src/wallet/wallet.controller.ts
- services/api-nest/src/wallet/withdraw-intent.service.ts
- services/api-nest/src/wallet/withdraw-stepup.policy.ts
- services/api-nest/src/wallet/withdraw-stepup.service.ts
- services/api-nest/tsconfig.json
- supabase/migrations/20260902155632_withdraw_broadcast_tron.sql (added)
- supabase/migrations/20260903092000_production_db_hardening.sql (added)

재발급 조건: Human/PO `ENGINE_ACCEPTANCE_REBASE_V1` ACK → rebase apply → current-epoch QA1-QA8 COMPLETE → QA9 `ENGINE_ACCEPTED_FOR_UI` → 그때만 인증서 재발급(ISSUED).
Local fake QA0-QA9 PASS = 0.
predecessor QA9 verdict 는 history · `qa9_predecessor_verdict_as_current_authoritative = FORBIDDEN`.
Product mutation을 green 추적에 사용하지 않았다.
