# ENGINE ACCEPTANCE REPORT

> **QA phase:** QA-8 `qa8-security-privacy`
> **Measured:** 2026-08-13T06:17:34.097Z
> **baseline_id:** `ea-baseline-2c7b9cffd323-1e2ce00bd6a1`
> **qa8_run_id:** `qa8-security-privacy-20260813`
> **qa8_result_checksum:** `0d2b88fa67f6ca42f08cc34c733a1bedc4f00e049d98e7be23fcd420cb547260`
> **mode:** `tiny`
> **asvs_version:** `5.0.0` (subset - exhaustive_certification_claim=false)

## Status banner

```text
ACCEPTANCE CONTRACT = LOCKED
BASELINE = FROZEN
QA0 = COMPLETE
QA1 = COMPLETE
QA2 = COMPLETE
QA3 = COMPLETE
QA4 = COMPLETE
QA5 = COMPLETE
QA6 = COMPLETE
QA7 = COMPLETE
QA8 = COMPLETE
QA HARNESS TARGET = SAFE
NEXT = QA9_ACCEPTANCE_REPORT
PRODUCT MUTATION = 0
EVAL_MUTATION = 0
GRADER_MUTATION = 0
03 UI = BLOCKED
ENGINE_ACCEPTED_FOR_UI = NOT_ISSUED
```

## Verdict (after QA-8)

| Field | Value |
|---|---|
| verdict | `ENGINE_NOT_ACCEPTED` |
| reason | QA8 COMPLETE (ASVS 5.0.0 subset) - found P0=1 P1=0 (admin-boundary zero-guard, real evidence) - 03 blocked - product mutation 0 - not repaired this wave |
| evidence_integrity | `VALID` |
| baseline.valid | `true` |
| working_tree_clean | `false` (fact only, not forced clean) |
| protected_scope_clean | `true` |
| defects.P0 / P1 / P2 / P3 | 1 / 0 / 1 / 0 |
| critical_invariant.blocked (cumulative, QA4-QA6 + QA8) | 6 |
| critical_invariant.skipped | 0 |
| critical_invariant.uncovered | 0 |
| mandatory suites COMPLETE | QA0..QA8 |

**Prohibited state confirmed:** `ENGINE_ACCEPTED_FOR_UI` is **not issued** (P0 defect present and/or critical BLOCKED > 0).

## QA8 Security and Privacy World (ASVS 5.0.0 subset)

| check_id | ASVS IDs | invariant | status |
|---|---|---|---|
| `QA8_ADMIN_BOUNDARY` | v5.0.0-8.2.1, v5.0.0-8.4.2 | `INV-ISOLATION-01` | `FAIL` |
| `QA8_USER_ISOLATION_SHARED_WITH_QA2` | v5.0.0-8.2.2, v5.0.0-8.3.1 | `INV-ISOLATION-01` | `PASS` |
| `QA8_JWT_TOKEN_VALIDATION` | v5.0.0-9.1.1, v5.0.0-9.1.2, v5.0.0-9.2.1, v5.0.0-9.2.3 | `INV-ISOLATION-01` | `PASS` |
| `QA8_PRIVACY_DELETE_ACCOUNT` | v5.0.0-14.2.7 | `INV-PRIVACY-01` | `FAIL` |
| `QA8_ERROR_DISCLOSURE_AND_LOGGING` | v5.0.0-16.5.1, v5.0.0-16.2.5 | `INV-PRIVACY-01` | `PASS` |

### Critical finding - QA8_ADMIN_BOUNDARY (P0)

Every `*.admin.controller.ts` route in `services/api-nest/src/**` (ledger balance-adjust,
withdraw-credentials, KYC decisions, deposit-config, risk rules, membership, referral,
ai-logs, and more) carries `@Controller("admin")` with **zero** `@UseGuards`. No global
`APP_GUARD`/middleware compensates in `app.module.ts`/`main.ts`. This is a live,
unauthenticated path to cross-user financial reads and unauthenticated balance
adjustment - recorded per ASVS v5.0.0-8.2.1 / v5.0.0-8.4.2. Root cause is a
self-documented, already-planned gap (`ledger.admin.controller.ts` comment: "Auth/RBAC
guard lands with Admin todos"; `schemas/admin-rbac.v1.json` + Admin plan section 9.9
AdminGuard are specified but not yet wired). **Not repaired in this wave.**

### Finding - QA8_PRIVACY_DELETE_ACCOUNT (P2)

`auth.service.ts#deleteAccount` performs an `UPDATE` (soft-delete) on `public.users`
(email/phone nulled, sessions revoked), not a hard `DELETE`. Schema `ON DELETE
CASCADE`/`SET NULL` foreign keys therefore never fire, so `ai_twin_memory`,
`notification_prefs`, `referral_edge`, and other user_id-linked rows persist after
account deletion. KYC 5-year retention is explicit documented policy (section 42.2.1)
and is not counted as part of this finding. ASVS v5.0.0-14.2.7. **Not repaired in this
wave.**

### PASS - QA8_USER_ISOLATION_SHARED_WITH_QA2, QA8_JWT_TOKEN_VALIDATION

User-facing IDOR/token-cross/interleave surfaces (shared oracle with QA2) and JWT
integrity/algorithm-allowlist/validity/audience (reusing
`tooling/verify/auth-jwt-runtime.cjs`) both pass.

### BLOCKED - SEC-DYNAMIC-ADVERSARIAL-01

Live adversarial HTTP testing against a booted api-nest instance is
`BLOCKED_ENV_CAPABILITY` on this Phase0 2C/~8GB machine (same axis already flagged by
`checks/user-isolation-surfaces.cjs`). Not mock-PASSed; deferred to the CI heavy matrix.

## Performance World (k6, CI only heavy) - QA6 record retained

QA6 record retained unchanged. suite status `UNSPECIFIED_PERF_BUDGET` - threshold
mechanism locked - numeric invention forbidden - heavy k6 CI only - artifact retention
>= 90 days - aggregator if: always().

### UNSPECIFIED_PERF_BUDGET

- Formal suite/budget status when product SLO/contract numeric budgets are absent.
- `BLOCKED_MISSING_ORACLE` on critical `INV-PERF-01` contributes to the cumulative
  critical_invariant.blocked count (ACCEPTED forbidden).
- Invented p95 / error_rate values are forbidden.

## Dual Dirty

- working_tree_clean=`false`
- protected_scope_clean=`true`
- forced clean / stash laundry = forbidden

## Next

`QA9_ACCEPTANCE_REPORT` per the 02.5 plan file-serial order. This wave does not start
QA9, does not repair the P0/P2 findings above, and does not issue
`ENGINE_ACCEPTED_FOR_UI`.
