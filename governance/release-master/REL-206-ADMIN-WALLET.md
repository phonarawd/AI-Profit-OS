# REL-206 /admin/wallet

STATUS: PRODUCTION_READY_CANDIDATE
UI_STATE_BEFORE: EXISTING_PARTIAL
ROUTE: /admin/wallet
FIGMA: NOT_FOUND
DATA_OWNER: GET deposit-config · GET krw-deposit-requests · GET deposit-disputes · GET withdraw-intents
REVIEW_TAB: AVAILABLE - GET/POST /api/v1/admin/wallet/withdraw-intents(/:id/approve|reject)
  (WithdrawReviewAdminController + WithdrawReviewService, already real before this
  correction - idempotencyKey required, optimistic-lock status-guarded UPDATE with
  reused-replay detection, admin audit write, reason>=10 chars on reject). This line
  previously (incorrectly) said "list API 없음" - corrected 2026-09-05 (S1F) after
  re-reading the actual service/controller/frontend source; see
  governance/release-master/evidence/REL-712-ADMIN-WITHDRAW-REVIEW-VERIFICATION.md
  for the fresh verification evidence (no reimplementation - existing code confirmed
  correct).
WRITES: KRW approve/reject · dispute credit/reject (reason · idempotency) ·
  withdraw-intent approve/reject (reason · idempotency)
SECRET_RENDER: 0
VERIFY: verify:rel-206-admin-wallet (now also asserts the review tab's real API wiring)
PROTECTED: false
