# MINE-020 — BACKEND RELEASE INTEGRATION

Status: **IN PROGRESS — BACKEND CONTRACT ROUTES INTEGRATED / DB BASELINE + STAGING E2E BLOCKED**  
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

## 3. Trial contract integration

Backend contract routes are now wired:

User:

- `GET /api/v1/mining/trial`
- `POST /api/v1/mining/trial/start`

Admin:

- `GET /api/v1/admin/mining/trial-config`
- `PATCH /api/v1/admin/mining/trial-config`

The routes are implemented by dedicated `MiningTrialController` and `MiningTrialAdminController` classes and registered in `MiningModule`. Admin trial-config is deny-by-default classified as `all:read` / `all:write` because the canonical RBAC vocabulary has no narrower unambiguous trial-program capability.

Trial runtime rules:

1. Trial welcome capital uses the historical `trial_grant_welcome` grant key.
2. The grant journal moves `SYS:OPS_POOL -> user.trial_principal` and is idempotent at `trial:trial_grant_welcome:{userId}`.
3. Trial start moves `trial_principal -> trial_locked` through the existing ledger posting service.
4. The trial window is 24 hours, matching the release master flow of returning the next day for completion.
5. Profit is calculated by the canonical Rust mining profit engine over exact rate-version time segments.
6. Trial profit is stored on `mine_trial_sessions.accrued_profit_usdt`; it is not credited into the user's real `profit` bucket.
7. Completion unlocks only the trial principal: `trial_locked -> trial_principal`.
8. Trial start is covered by the existing `mining_new_positions` kill switch.
9. Admin trial config mutations require Idempotency-Key, reason, admin audit, and deny-by-default RBAC.

## 4. BLOCKER-TRIAL-LEDGER-PREREQ-01 — RESOLVED

Historical Supabase project `mgsytcetsiecllmhcyox` retained the exact original migration registry entry for:

`20260909040657_trial_welcome_grant`

The exact historical SQL has been restored to the repository as:

`supabase/migrations/20260909040657_trial_welcome_grant.sql`

Recovered authority includes:

- `trial_principal`
- `trial_locked`
- six-bucket `provision_user_bucket_accounts()` behavior
- `wallet_buckets.trial_principal_usdt`
- `wallet_buckets.trial_locked_usdt`
- `trial_program_config`
- `trial_grants`
- `trial_user_state`
- `trial_settlements`
- journal type `trial_grant`
- welcome grant rule: no journal without a valid FX snapshot

Historical live data also confirmed the real grant flow:

- source: `SYS:OPS_POOL`
- destination: `USER:{userId}:trial_principal`
- reference type: `trial_grant`
- reference id: `trial_grant_welcome`
- idempotency: `trial:trial_grant_welcome:{userId}`

No `practice` balance is reused for mining trial and no independent balance system was introduced.

### Sequential trial compatibility

`trial_program_config.default_max_participations` and `trial_user_state.max_participations` allow values 1 through 3, while the original mining foundation declared `mine_trial_sessions.trial_grant_id` unique. That would prevent a single historical welcome grant from funding a second sequential trial session.

The additive compatibility migration:

`supabase/migrations/20260922010000_mining_trial_repeatability_v1.sql`

removes only that one-grant/one-session uniqueness constraint and replaces it with a normal lookup index. The welcome grant remains one-time; the same isolated trial capital may be reused across sequential sessions subject to `trial_user_state` participation limits.

## 5. Current Production baseline mismatch

Current connected Production Supabase:

- project: `PUTDUK-DATA-PRODUCTION`
- ref: `gaugwamwceqdnqdqrxqg`
- current public tables observed include `profiles`, `wallet_accounts`, `task_runs`, `work_submissions`, etc.

The historical mining migration chain depends on objects such as:

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
- current integration SHA still requires canonical typecheck/build/assertion verification
- user web still requires a fresh audit/wiring pass for the newly available trial endpoints
- Production migration remains approval-gated after compatibility rehearsal

## 7. Verification gate

Static integration gate:

```bash
node quality/mining/phase20_release_integration_assertions.mjs
```

It now requires:

- exact high-value contract routes
- high-value controller/RBAC wiring
- fail-closed configurable high-value threshold
- pending-before-approval behavior
- stable ledger start idempotency key
- principal-to-locked approval posting
- exact user/admin trial contract routes
- trial controller/module wiring
- trial admin deny-by-default RBAC classification
- restored historical trial ledger migration
- `trial_principal` / `trial_locked` isolation
- historical welcome grant authority and idempotency vocabulary
- 24-hour trial window
- canonical Rust mining profit engine use
- trial lock/unlock ledger paths
- repeated-trial schema compatibility
- Production baseline blocker documentation

## 8. Next safe order

1. Canonically verify the current integration exact SHA with PHASE20 assertions + typecheck + build.
2. Audit/wire the consumer trial calls against the now-integrated backend routes.
3. Rebuild current mutation E2E from the verified integration SHA.
4. Provision/recover isolated staging DB and rehearse the complete historical + mining migration chain there.
5. Design the Production baseline compatibility bridge only after staging evidence exists.
6. Freeze RC only after DB compatibility, consumer trial, staging, and E2E blockers close.
7. Production migration/deployment requires separate explicit approval.

**Production untouched.**
