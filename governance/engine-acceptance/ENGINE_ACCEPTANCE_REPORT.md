# ENGINE ACCEPTANCE REPORT

> **QA phase:** QA-9 `qa9-acceptance-report` (FINAL aggregation / verdict issuance — not a new discovery suite)
> **Measured:** 2026-08-13T21:39:55.434Z
> **baseline_id:** `ea-baseline-fdf692cb8a02-d532a6d7958b`
> **qa9_run_id:** `qa9-acceptance-report-20260813`
> **qa9_result_checksum:** `7f02daf070aa0bf8024c0401fe61a051768ad55759298743c1bf46bd9feec4db`
> **aggregation_only:** `true` — consumes QA0-QA8 evidence exactly as recorded, invents no scenarios

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
QA9 = COMPLETE
QA HARNESS TARGET = SAFE
NEXT = 03_blocked_fix_round
PRODUCT MUTATION = 0
03 UI = BLOCKED
ENGINE_ACCEPTED_FOR_UI = NOT_ISSUED
UI_UX_ENTRY_GATE = CLOSED
```

## FINAL_ACCEPTANCE_VERDICT

| Field | Value |
|---|---|
| verdict | `ENGINE_NOT_ACCEPTED` |
| reason | QA9 COMPLETE (final aggregation of QA0-QA8 evidence per acceptance-contract.v1.md L1) - defects.P0=0 defects.P1=5 (QA8_ADMIN_BOUNDARY unauthenticated admin surface, real evidence) force ENGINE_NOT_ACCEPTED regardless of critical_invariant.blocked=2 - 03 UI remains BLOCKED - ENGINE_ACCEPTED_FOR_UI NOT_ISSUED - repair round required (see REPAIR_ENTRY_POINT / RECOMMENDED_REPAIR_BATCH in ENGINE_ACCEPTANCE_REPORT.md) - product mutation 0 this wave |
| evidence_integrity | `VALID` |
| baseline.valid | `true` |
| working_tree_clean | `false` (fact only, not forced clean) |
| protected_scope_clean | `true` |
| acceptance_scope.unchanged | `true` |

**Prohibited state confirmed:** `ENGINE_ACCEPTED_FOR_UI` is **not issued**. `UI_UX_ENTRY_GATE = CLOSED`.

## ACCEPTANCE_FORMULA_INPUTS

| Input | Value |
|---|---|
| mandatory_suite.QA1..QA8.status == COMPLETE | `true` |
| critical_invariant.blocked | `2` |
| critical_invariant.skipped | `0` |
| critical_invariant.uncovered | `0` |
| defects.P0 | `0` |
| defects.P1 | `5` |
| defects.P2 | `0` |
| defects.P3 | `0` |
| baseline.valid | `true` |
| acceptance_scope.unchanged | `true` |
| report.baseline_id == baseline.id | `true` |
| report.evidence_integrity == VALID | `true` |

### Mandatory suite status (QA1-QA8)

| suite | completion_status |
|---|---|
| `QA1` | `COMPLETE` |
| `QA2` | `COMPLETE` |
| `QA3` | `COMPLETE` |
| `QA4` | `COMPLETE` |
| `QA5` | `COMPLETE` |
| `QA6` | `COMPLETE` |
| `QA7` | `COMPLETE` |
| `QA8` | `COMPLETE` |

## P0_SECURITY_FINDINGS (must remain visible — not buried in defects.v1.json only)

### QA8_ADMIN_BOUNDARY — P0 — INV-ISOLATION-01 — repair NOT executed this wave

Every `*.admin.controller.ts` route in `services/api-nest/src/**` (19 controllers scanned,
19 unguarded, 0 guarded) — ledger balance-adjust, withdraw-credentials, KYC decisions,
deposit-config, risk rules, membership, referral, ai-logs, opportunities override,
platform-reserve, simulation, adapters, execution-policy, ops-inbox — carries
`@Controller("admin")` with **zero** `@UseGuards`. No global `APP_GUARD`/middleware in
`app.module.ts`/`main.ts` compensates. This is a live, unauthenticated path to cross-user
financial reads and unauthenticated balance adjustment (ASVS v5.0.0-8.2.1 / v5.0.0-8.4.2).
Highest-impact surfaces: `ledger.admin.controller.ts` (unauthenticated money balance
adjustment; cross-user financial/ledger read), `withdraw-credentials.admin.controller.ts`
(withdrawal credential exposure), `kyc.admin.controller.ts` (unauthenticated KYC
decision/PII surface). Root cause: `AdminGuard` is specified
(`schemas/admin-rbac.v1.json`, `ai_profit_os_04_admin_e5f6a7b8.plan.md` §9.9) but has
**zero** implementation under `services/api-nest/src/**` and is wired onto **zero**
controllers. **This single P0 forces `ENGINE_NOT_ACCEPTED` regardless of any other
input.** Not repaired in QA9 (aggregation/reporting wave only).

- (none)

## OTHER_DEFECTS

### QA8_PRIVACY_DELETE_ACCOUNT — P2 — INV-PRIVACY-01 — repair NOT executed this wave

`auth.service.ts#deleteAccount` performs an `UPDATE` (soft-delete) on `public.users`, not a
hard `DELETE`. Schema `ON DELETE CASCADE`/`SET NULL` foreign keys never fire, so
`ai_twin_memory`, `notification_prefs`, `referral_edge`, and other user_id-linked rows
persist after account deletion (ASVS v5.0.0-14.2.7). KYC 5-year retention is documented
policy (§42.2.1) and is explicitly NOT counted in this finding.

- `P1` `qa4:TIME-KST-DAY-BOUNDARY` (suite `QA4`, invariant `INV-TIME-01`) — stateful-time fail: TIME-KST-DAY-BOUNDARY
- `P1` `qa4:TIME-PLUS-30D` (suite `QA4`, invariant `INV-TIME-01`) — stateful-time fail: TIME-PLUS-30D
- `P1` `qa4:TIME-MULTI-DAY-LIFECYCLE` (suite `QA4`, invariant `INV-LIFECYCLE-01`) — stateful-time fail: TIME-MULTI-DAY-LIFECYCLE
- `P1` `qa5:FAULT-AI-429-DEGRADE` (suite `QA5`, invariant `INV-FEED-AI-01`) — failure-world fail: FAULT-AI-429-DEGRADE
- `P1` `qa5:FAULT-RECOVERY-LEDGER-SCAN` (suite `QA5`, invariant `INV-LEDGER-01`) — failure-world fail: FAULT-RECOVERY-LEDGER-SCAN

## REMAINING_BLOCKED (critical_invariant.blocked cumulative = 2)

| # | code | suite | invariant | note |
|---|---|---|---|---|
| 1 | `BLOCKED_NO_CLOCK_HOOK` | QA4 | INV-TIME-01 | no injectable clock seam under `services/api-nest/src/{common,time,testing}` |
| 2 | `BLOCKED_NO_FAULT_HOOK` | QA5 (axis1) | INV-FEED-AI-01 | no injectable fault seam |
| 3 | `BLOCKED_NO_FAULT_HOOK` | QA5 (axis2) | INV-LEDGER-01 | post-recovery scan depends on same fault seam |
| 4 | `BLOCKED_MISSING_ORACLE` | QA6 | INV-PERF-01 | `UNSPECIFIED_PERF_BUDGET` — no product SLO/contract numeric budget to test against |
| 5 | (QA4/5/6 cumulative subtotal) | — | — | 5 (carried unchanged since QA6, per `critical_invariant_cumulative.sources.QA4_QA6_cumulative`) |
| 6 | `BLOCKED_ENV_CAPABILITY` | QA8 | INV-ISOLATION-01 | `SEC-DYNAMIC-ADVERSARIAL-01` — live adversarial HTTP pentest harness against a booted Nest+DB instance does not exist yet (not Phase0-RAM-only; the runner itself is unbuilt even for CI heavy mode — `checks/security-privacy-world.cjs` hardcodes this scenario `status: "BLOCKED"` independent of `mode`) |

Total = **6**, matching `evidence-manifest.v1.json critical_invariant.blocked` and
`qa8-result.v1.json critical_invariant_cumulative.blocked`. None of the 6 were converted
to FAIL/PASS/SKIPPED to manufacture a cleaner verdict (mock-PASS and BLOCKED-laundering are
both forbidden by acceptance-contract §L3).

### Performance World (k6, CI only heavy) — QA6 record retained

QA6 record retained unchanged through QA7/QA8/QA9. suite status `UNSPECIFIED_PERF_BUDGET`
— k6 scenario-mix + tag threshold mechanism locked — numeric SLO invention forbidden — heavy
k6 remains CI only — artifact retention >= 90 days — aggregator `if: always()`. Resolving
this BLOCKED_MISSING_ORACLE requires Human/PO to supply real numeric p95/error-rate budgets
(see RECOMMENDED_REPAIR_BATCH item 1); the harness will not invent one.

## REPAIR_ENTRY_POINT (governance state — planning only, not executed)

The repository does **not** yet define a dedicated, separately-coded "post-QA9 repair
round" runner/workflow job. What exists:

1. **Protected product repair** (touches `services/api-nest/src/**` or other
   `protected-scope.v1.json` roots) is an **already-used, already-governed pattern** —
   three prior repairs during 02.5 (`ca476b4`, `2c7b9cf`, and the api-nest TS build fix at
   `a280b21`) each (a) changed protected bytes as an ordinary commit, then (b) triggered
   `ENGINE_ACCEPTANCE_REBASE_V1` (`tooling/engine-acceptance/rebase-acceptance-baseline.cjs`,
   Human/PO ACK required) to open a new acceptance epoch, then (c) re-ran QA1-QA6 then QA7.
   The QA8 P0/P2 repairs would follow this **same** mechanism — there is no separate "repair
   plan" file to author first.
2. **Harness-only repair** = `tooling/engine-acceptance/**` changes with zero product-byte
   impact (e.g. building the actual `SEC-DYNAMIC-ADVERSARIAL-01` live-pentest runner). Uses
   normal T0/T1 commit gates; no rebase needed since protected scope is untouched.
3. **Governance-only repair** = `governance/engine-acceptance/**` bookkeeping (this wave's
   own category).
4. **Workflow L7 amendment** = `.github/workflows/engine-acceptance.yml` change under
   `POST_QA0_CONTROLLED_WORKFLOW_AMENDMENT_V1` (Human/PO ACK, exact-diff QA0-QA6
   semantics-unchanged proof). Not required for QA9 itself (no workflow file touched this
   wave).
5. **Performance budget Human/PO approval** = QA6's `UNSPECIFIED_PERF_BUDGET` can only
   become a real PASS/FAIL once Human/PO supplies actual numeric p95/error-rate budgets;
   `perf-budget.v1.json`'s `numeric_invention_forbidden` lock means the harness cannot
   self-supply these.
6. **L8 `ENGINE_ACCEPTANCE_REBASE_V1`** = required for ANY of: the QA8 P0 AdminGuard wiring,
   the QA8 P2 hard-delete fix, or adding a QA4/QA5 injectable clock/fault seam — all three
   necessarily edit files under `services/api-nest/src/**` (protected scope).

**Governance gap (QA9 contemporaneous record, subsequently repaired):** QA9 identified that L8
`INVALIDATED_SUITES`/`REQUIRED_RERUN_SUITES` predated QA8/QA9 and used a single exact-match
constant against historical approvals. That finding was recorded as
`HUMAN_PO_APPROVAL_REQUIRED` and was **not** applied during QA9.

## REBASE_GOVERNANCE_GAP — repaired as `ENGINE_ACCEPTANCE_REBASE_POLICY_V2`

Human/PO ACK APPROVED the policy-versioned repair (`amendment_id=rebase-policy-qa8-qa9-topology-20260814`).
Historical V1 approvals remain valid; future rebases use V2:

- discovery invalidate/rerun includes **QA8** (STALE + historical provenance + washing)
- **QA9** is aggregation-only: `stale_aggregation_phases`, not a discovery suite; predecessor
  QA9 verdict/report is not current-authoritative; aggregation reruns only after current-epoch
  discovery evidence exists
- V1 shape cannot authorize a new rebase
- this repair created **no** new acceptance epoch and did **not** invalidate current evidence

## RECOMMENDED_REPAIR_BATCH (planning only — product items not executed by QA9)

Grouped in lowest-rerun-cost order (harness/governance-only first, protected-product last,
since every protected-product change forces a full QA1-QA8 then QA9 aggregation rebase rerun):

1. **QA6 performance budget — Human/PO approval only.** Supply real numeric SLOs; update
   `perf-budget.v1.json` (governance-only, no rebase) once approved.
2. **QA8 dynamic adversarial harness — harness-only.** Build the actual
   `SEC-DYNAMIC-ADVERSARIAL-01` live-pentest runner under `tooling/engine-acceptance/**`
   (no product bytes touched; no rebase needed).
3. **Rebase governance gap — COMPLETE** under `ENGINE_ACCEPTANCE_REBASE_POLICY_V2`
   (governance/tooling-only; no product mutation; no new epoch).
4. **QA4/QA5 clock+fault injection seam — protected product mutation.** Add an injectable
   clock/fault provider under `services/api-nest/src/common|time|testing` (new files, plus
   wiring existing time/fault-dependent call sites to consult it). Triggers L8 rebase.
5. **QA8 P0 admin AdminGuard — protected product mutation (highest priority, blocks
   everything).** Implement `AdminGuard` (schemas/admin-rbac.v1.json role matrix,
   ai_profit_os_04_admin plan §9.9) and wire `@UseGuards(AdminGuard)` onto all 19
   `*.admin.controller.ts` files. Triggers L8 rebase; full QA1-QA8 then QA9 aggregation
   rerun required before any new verdict.
6. **QA8 P2 delete-account retention — protected product mutation.** Change
   `auth.service.ts#deleteAccount` to a real hard-`DELETE` (or explicit per-table
   nulling/deletion) for the residual non-KYC tables. Can ride in the SAME rebase epoch as
   #5 (same PR/commit window) to avoid a second full rerun.

QA9 aggregation does not execute protected-product items 1,2,4,5,6. Item 3 is the
policy-versioned rebase repair.

## Dual Dirty

- working_tree_clean=`false`
- protected_scope_clean=`true`
- forced clean / stash laundry = forbidden

## NEXT_CANONICAL_WAVE

`03_blocked_fix_round` — verdict `ENGINE_NOT_ACCEPTED` blocks 03 UI. The next canonical wave is a
**repair round** (see RECOMMENDED_REPAIR_BATCH), governed by `ENGINE_ACCEPTANCE_REBASE_V1`
for any protected-product item, NOT a resumption of `02.5` discovery (QA0-QA9 are all
COMPLETE) and NOT `03 UI` (blocked until a genuinely earned
`ENGINE_ACCEPTED_FOR_UI` + `acceptance_scope.unchanged`).
