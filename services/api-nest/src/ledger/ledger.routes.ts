/** Admin Money API surface — UI Owns=Admin · contracts Owns=Money */

export const LEDGER_ADMIN_ROUTES = {
  journals: "ledger/journals",
  journalById: "ledger/journals/:journalId",
  recon: "ledger/recon",
  financialReport: "reports/financial",
  balanceAdjust: "users/:userId/balance-adjust",
  userBuckets: "users/:userId/buckets",
} as const;
