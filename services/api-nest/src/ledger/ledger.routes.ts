/** Admin Money API surface — UI Owns=Admin · contracts Owns=Money */

export const LEDGER_ADMIN_ROUTES = {
  journals: "ledger/journals",
  journalById: "ledger/journals/:journalId",
  recon: "ledger/recon",
  financialReport: "reports/financial",
  balanceAdjust: "users/:userId/balance-adjust",
  userBuckets: "users/:userId/buckets",
} as const;

/** REL-015 유저 조회. Admin 경로와 권한 분리. GET only. */
export const LEDGER_USER_ROUTES = {
  journals: "journals",
  journalById: "journals/:journalId",
} as const;
