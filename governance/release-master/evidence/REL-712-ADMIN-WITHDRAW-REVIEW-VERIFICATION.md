# REL-712 - Admin withdraw review: verification, not reimplementation

Date: 2026-09-05 (S1F session)

## Why this file exists

The S1F launch directive's own starting brief said a prior report claimed "no
admin wallet review API exists" and asked this session to re-verify against
the actual current-SHA code before doing anything else, and to fix only what
is actually broken rather than rebuilding a working feature.

## What was actually found (read, not assumed)

- `services/api-nest/src/wallet/withdraw-review.admin.controller.ts` -
  `WithdrawReviewAdminController`, `@UseGuards(AdminGuard)`, routes:
  `GET wallet/withdraw-intents` (list), `GET wallet/withdraw-intents/:id`
  (get), `POST wallet/withdraw-intents/:id/approve`, `POST
  wallet/withdraw-intents/:id/reject`. Registered in `WalletModule`.
- `services/api-nest/src/wallet/withdraw-review.service.ts` -
  `WithdrawReviewService.decide()`:
  - requires `idempotencyKey` (>=8 chars) and, for reject, `reason` (>=10
    chars)
  - loads the current row, computes the transition via
    `nextWithdrawReviewStatus()` (pure state machine in
    `withdraw-review.policy.ts`)
  - if the transition says "already decided this way" (`reused: true`),
    returns the existing state idempotently without a second audit write or
    ledger mutation
  - writes an admin audit record (`AdminAuditService.write`) BEFORE the
    status UPDATE, and refuses to proceed if the audit write did not persist
    (`AUDIT_STORE_UNAVAILABLE`) - the audit trail can never be skipped
  - the actual `UPDATE ... WHERE id = $1 AND status = $4` (the pending
    status) is optimistic-lock style: if another request already changed the
    row between the read and this write, `rows[0]` is empty and the code
    re-reads and re-evaluates rather than blindly overwriting
  - emits a `WALLET_EVENTS.withdrawAdminApproved`/`Rejected` event
  - never mutates the ledger directly - out of scope for this controller by
    design (money movement lives in the ledger domain, not here)
- `apps/admin/app/admin/wallet/page.tsx` - the "review" tab
  (`data-testid="wallet-review-panel"`) already calls
  `GET /api/v1/admin/wallet/withdraw-intents`, renders each item
  (`data-testid="wallet-review-row"`), and calls the approve/reject POST
  routes with a required reason field and a busy-state guard against
  double-submit.
- `services/api-nest/src/common/admin-capabilities.ts` -
  `WithdrawReviewAdminController: { list: read("wallet"), get: read("wallet"),
  approve: write("withdrawApprove"), reject: write("withdrawApprove") }` -
  deny-by-default classified, not wildcard.

**Conclusion: the claim "no admin wallet review API exists" is false at this
SHA.** `governance/release-master/REL-206-ADMIN-WALLET.md`'s own
"REVIEW_TAB: UNAVAILABLE (list API 없음)" line was itself stale documentation
(most likely written before this feature existed, never updated after) -
corrected in this same session.

## Fresh verification run this session (no reimplementation)

1. `services/api-nest/src/wallet/withdraw-review.policy.runtime.test.ts` -
   3/3 PASS (`npx tsx --test`): approve/reject idempotent replay,
   `ALREADY_DECIDED` on the opposite decision after either, `NOT_REVIEWABLE`
   for `ledger_posted`/`completed` intents.
2. `pnpm verify:admin-boundary` - PASS, 27 admin controllers / 121 routes
   classified, including a real Nest+HTTP adversarial round-trip
   (`admin-guard.selftest.ts`, 25/25 checks) that specifically exercises
   `WithdrawReviewAdminController`'s own capability requirements (missing
   token -> 401, wrong role/capability -> 403, correct role -> 201, operator
   identity always taken from the verified token, never from the request
   body).
3. `pnpm verify:wallet-kyc-session-auth` - PASS.
4. `pnpm verify:rel-206-admin-wallet` - PASS (this session added the
   previously-missing assertions for the review tab's real API wiring, so
   this script can no longer silently regress to the old, false,
   "unavailable" state).

## What was NOT done (and why)

- No live INSERT-and-approve test was run against the real
  `public.withdraw_intents` table (0 rows at the time of this session).
  Mutating production data to exercise this path is explicitly out of scope
  ("production 데이터를 임의 삭제·수정 금지") and no isolated staging database
  branch could be targeted through the available tooling in this session
  (see the main session report's `SUPABASE_MIGRATIONS` section). A full
  insert -> approve -> ledger-reconciliation rehearsal against a real or
  branched database is still open work for a staging pass with either
  Founder authorization to write directly, or a working Supabase branch
  target.

## Result

`ADMIN_WALLET_REVIEW` = **VERIFIED_EXISTING_NOT_REBUILT**. No duplicate API,
no duplicate UI, no changes to `withdraw-review.service.ts` or
`withdraw-review.admin.controller.ts` in this session - only the stale
documentation and the verify script's coverage gap were fixed.
