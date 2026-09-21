# MINE-020 — BACKEND RELEASE INTEGRATION

Status: **IN PROGRESS — HIGH-VALUE INTEGRATED / TRIAL + DB BASELINE BLOCKED**  
Base SHA: `d6e279841aaa62b7b75f26a7b33d1768923d551b`  
Branch: `phase/mine-release-integration-20260921`  
Safety: **Production untouched.**

## 1. Correct integration base

The release-integration branch starts from the audited admin authority:

`d6e279841aaa62b7b75f26a7b33d1768923d551b`

The real PHASE02 DB foundation closure is already an ancestor of this line:

`74b80fd3963047c2e97fb9ed3004dbff664743b6`

The stale branch ref `phase/mine-db-foundation-20260920` must not be merged by name.

## 2. High-value review contract integration

Implemented contract routes:

- `GET /api/v1/admin/mining/high-value-reviews`
- `GET /api/v1/admin/mining/high-value-reviews/:reviewId`
- `POST /api/v1/admin/mining/high-value-reviews/:reviewId/approve`
- `POST /api/v1/admin/mining/high-value-reviews/:reviewId/reject`

Runtime behavior:

1. Every new mining start reads `mines.metadata.highValueThresholdAmount`.
2. Missing or malformed threshold **fails closed**; the request is not allowed to bypass review.
3. Below-threshold requests continue through the existing mining start path.
4. At/above-threshold requests create a `START_PENDING` position and a `mine_high_value_reviews` row only. No principal is locked at request time.
5. Approval reuses the stable existing mining start journal key and moves `principal -> locked` through the existing double-entry ledger posting service, then activates the position.
6. Rejection ends the still-pending position without moving money.
7. Approval is blocked by the existing `mining_new_positions` kill-switch path.
8. Admin mutations require Idempotency-Key, reason, admin audit, and deny-by-default RBAC classification.

RBAC:

- review list/detail: `ledger:read`
- approve/reject: `balanceAdjust:write`

The threshold is not hardcoded in code or the review table; the request-time value is snapshotted into `mine_high_value_reviews.threshold_usdt`.

## 3. Remaining contract completeness scope

Still intentionally open:

User:

- `GET /api/v1/mining/trial`
- `POST /api/v1/mining/trial/start`

Admin:

- `GET /api/v1/admin/mining/trial-config`
- `PATCH /api/v1/admin/mining/trial-config`

These routes are not being faked or marked complete before the trial ledger prerequisite is reconciled.

## 4. Historical trial ledger prerequisite

PHASE02 governance records that the historical staging database `mgsytcetsiecllmhcyox` already contained:

- `trial_grants`
- `trial_principal`
- `trial_locked`

and `mine_trial_sessions` was deliberately designed to reuse those objects.

The repo's older base ledger migration, however, only creates:

- principal
- profit
- locked
- practice

The mining foundation migration references `trial_grants` and `wallet_buckets.trial_principal_usdt` / `trial_locked_usdt` but does not create those prerequisites itself.

### BLOCKER-TRIAL-LEDGER-PREREQ-01

Before implementing trial start as a real financial path, recover or reconstruct the exact migration/source-of-truth that created the historical trial ledger objects. Do not map trial mining onto `practice`, and do not invent an independent balance system.

Required evidence:

- exact DDL for `trial_grants`
- exact ledger bucket constraint for `trial_principal` / `trial_locked`
- exact user-bucket provisioning behavior
- exact `wallet_buckets` projection including trial buckets
- ledger posting vocabulary/idempotency rules for trial grant/lock/unlock

## 5. Current Production baseline mismatch

Current connected Production Supabase:

- project: `PUTDUK-DATA-PRODUCTION`
- ref: `gaugwamwceqdnqdqrxqg`
- current public tables observed include `profiles`, `wallet_accounts`, `task_runs`, `work_submissions`, etc.

The mining foundation migration explicitly depends on historical-schema objects such as:

- `public.users`
- `public.admin_rbac`
- `public.ledger_accounts`
- `public.ledger_journals`
- `public.wallet_buckets`
- `public.trial_grants`

Those prerequisites were not present in the current Production public-table inventory read during PHASE20.

### BLOCKER-DB-BASELINE-COMPAT-01

The historical mining schema cannot be assumed deployable onto the current Production database baseline. A compatibility/migration bridge must be designed and rehearsed on isolated non-Production infrastructure before any Production migration request.

This blocker is stronger than “mining migration not yet applied”: the current release database lineage must first be reconciled with the historical `AI-Profit-OS` ledger lineage.

## 6. Other open release blockers

- current E2E must be rebuilt from the integrated backend line; historical E2E tip is verifier residue
- isolated staging Supabase must be provisioned/recovered and identity-checked as non-Production
- trial contract completeness remains open until ledger prerequisite recovery
- Production migration remains approval-gated after compatibility rehearsal

## 7. Verification gate

Static integration gate:

```bash
node quality/mining/phase20_release_integration_assertions.mjs
```

It verifies:

- exact high-value contract routes
- controller wiring
- RBAC classification
- fail-closed configurable threshold
- pending-before-approval behavior
- stable ledger start idempotency key
- principal-to-locked approval posting
- kill-switch enforcement
- trial routes remain explicitly open rather than silently claimed complete
- DB/trial prerequisite blocker markers remain documented

## 8. Next safe order

1. Canonically verify the high-value integration exact SHA with build/typecheck/assertions.
2. Recover historical trial ledger DDL/source or produce a reviewed compatibility bridge.
3. Implement the remaining 4 trial/trial-config routes only against that authoritative ledger model.
4. Rebuild current mutation E2E from the resulting integration SHA.
5. Provision/recover isolated staging DB and rehearse the complete migration chain there.
6. Freeze RC only after DB compatibility, trial, staging, and E2E blockers close.
7. Production migration/deployment requires separate explicit approval.

**Production untouched.**
