# ENGINE ACCEPTANCE REPORT

> **QA phase:** QA-8 `qa8-security-privacy`
> **Measured:** 2026-08-24T09:43:08.426Z
> **baseline_id:** `ea-baseline-04ef3c7de4dd-2ff1760b7d72`
> **qa8_run_id:** `qa8-security-privacy-20260824`
> **qa8_result_checksum:** `69486158c4a8b7c19fbde5da708ef0f05f5faab249c30b4e45a7e6182e051ed4`
> **mode:** `full`
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
| verdict | `ENGINE_QA_INCOMPLETE` |
| reason | QA8 COMPLETE - P0/P1=0 - mandatory suite QA9 report not yet issued |
| evidence_integrity | `VALID` |
| baseline.valid | `true` |
| working_tree_clean | `false` (fact only, not forced clean) |
| protected_scope_clean | `true` |
| defects.P0 / P1 / P2 / P3 | 0 / 0 / 0 / 0 |
| critical_invariant.blocked (cumulative, QA4-QA6 + QA8) | 0 |
| critical_invariant.skipped | 0 |
| critical_invariant.uncovered | 0 |
| mandatory suites COMPLETE | QA0..QA8 |

**Prohibited state confirmed:** `ENGINE_ACCEPTED_FOR_UI` is **not issued** (P0 defect present and/or critical BLOCKED > 0).

## QA8 Security and Privacy World (ASVS 5.0.0 subset)

| check_id | ASVS IDs | invariant | status |
|---|---|---|---|
| `QA8_ADMIN_BOUNDARY` | v5.0.0-8.2.1, v5.0.0-8.4.2 | `INV-ISOLATION-01` | `PASS` |
| `QA8_USER_ISOLATION_SHARED_WITH_QA2` | v5.0.0-8.2.2, v5.0.0-8.3.1 | `INV-ISOLATION-01` | `PASS` |
| `QA8_JWT_TOKEN_VALIDATION` | v5.0.0-9.1.1, v5.0.0-9.1.2, v5.0.0-9.2.1, v5.0.0-9.2.3 | `INV-ISOLATION-01` | `PASS` |
| `QA8_PRIVACY_DELETE_ACCOUNT` | v5.0.0-14.2.7 | `INV-PRIVACY-01` | `PASS` |
| `QA8_ERROR_DISCLOSURE_AND_LOGGING` | v5.0.0-16.5.1, v5.0.0-16.2.5 | `INV-PRIVACY-01` | `PASS` |

### PASS - QA8_ADMIN_BOUNDARY

25 admin controllers scanned, 0 unguarded (static @UseGuards scan). Dynamic Nest+HTTP adversarial round-trip (tooling/verify/admin-boundary.cjs) PASS: PASS - missing admin signing secret -> 401 (admin routes stay closed) (status=401) | [admin-guard.selftest] ALL PASS — real Nest HTTP admin boundary verified (25 checks) | [verify:admin-boundary] PASS (25 admin controllers · 115 routes classified · global APP_GUARD · real Nest HTTP adversarial round-trip)

### PASS - QA8_PRIVACY_DELETE_ACCOUNT

delete_mode=purge_and_tombstone; purge_table_count=26; sessions_purged=true; KYC retention (§42.2.1) excluded from this finding. Dynamic proof (run-qa8-adversarial.cjs privacy_delete (isolated CI Postgres + booted Nest)): tombstone=true purge=true retain=true control_user_unaffected=true invalid_confirm_no_mutation=true.

### PASS - QA8_USER_ISOLATION_SHARED_WITH_QA2, QA8_JWT_TOKEN_VALIDATION, QA8_ERROR_DISCLOSURE_AND_LOGGING

### PASS - SEC-DYNAMIC-ADVERSARIAL-01

Real adversarial HTTP evidence against a booted api-nest instance (isolated CI Postgres). No findings.

This QA8 run is discovery/aggregation only - any current or future FAIL finding is recorded honestly and is not repaired in this wave.

## Performance World (k6, CI only heavy) - QA6 record retained

QA6 record retained unchanged. suite status `PASS` - budget SPECIFIED (Human/PO ACK) -
tags evaluated: `feed_read`, `participate`, `wallet_read`, `auth_profile` - threshold mechanism locked - numeric invention forbidden -
heavy k6 CI only - artifact retention >= 90 days - aggregator if: always().

| tag | status | blocked_code |
|---|---|---|
| `feed_read` | `PASS` | `-` |
| `participate` | `PASS` | `-` |
| `wallet_read` | `PASS` | `-` |
| `auth_profile` | `PASS` | `-` |

## Dual Dirty

- working_tree_clean=`false`
- protected_scope_clean=`true`
- forced clean / stash laundry = forbidden

## Next

`QA9_ACCEPTANCE_REPORT` per the 02.5 plan file-serial order. This wave does not start
QA9, does not repair the P0/P2 findings above, and does not issue
`ENGINE_ACCEPTED_FOR_UI`.
