/** Wallet API paths · UI Owns=Admin/Web · contracts Owns=Money */

export const WALLET_USER_ROUTES = {
  myDepositAddress: "my-deposit-address",
  krwDepositRequests: "krw-deposit-requests",
  /**
   * §43.1 Phase0/1 ingest — Transfer observation (worker or phase0 tick).
   * Not a user UI surface.
   */
  usdtDepositObserve: "usdt-deposits/observe",
  chainWatcherTick: "chain-watcher/tick",
  chainWatcherStatus: "chain-watcher/status",
  /** §43.2 Phase0 in-process Energy+TRX sweeper */
  chainSweeperTick: "chain-sweeper/tick",
  chainSweeperStatus: "chain-sweeper/status",
  /** §49.7 */
  buckets: "buckets",
  /** §49.7 profit→principal */
  profitMerge: "profit/merge",
  /** §51.7 practice welcome (idempotent · normally via signup provision) */
  practiceWelcome: "practice/welcome",
  /** §51.7 Phase0 expire cron tick */
  practiceExpireTick: "practice/expire-tick",
  /** §49.3 */
  withdraw: "withdraw",
  /** §43.6 step-up */
  withdrawStepUpPolicy: "withdraw/step-up/policy",
  withdrawStepUpChallenge: "withdraw/step-up/challenge",
  withdrawStepUpVerify: "withdraw/step-up/verify",
  withdrawPinSet: "withdraw/pin/set",
  /** §41.6 · §51.11 wrong-chain CS entry */
  depositDisputes: "deposit-disputes",
} as const;

export const WALLET_ADMIN_ROUTES = {
  depositConfig: "wallet/deposit-config",
  depositConfigAudit: "wallet/deposit-config/audit",
  krwDepositRequests: "wallet/krw-deposit-requests",
  krwDepositApprove: "wallet/krw-deposits/:id/approve",
  krwDepositReject: "wallet/krw-deposits/:id/reject",
  /** §41.6 · §51.11 · Admin wallet?tab=disputes */
  depositDisputes: "wallet/deposit-disputes",
  depositDisputeCredit: "wallet/deposit-disputes/:id/credit",
  depositDisputeReject: "wallet/deposit-disputes/:id/reject",
  /** Read-only operational visibility for §49.3 withdraw intents. */
  withdrawReviews: "wallet/withdrawals",
  /** §43.6a · Admin §9.8.10E */
  withdrawPinReset: "users/:id/withdraw-pin/reset",
  webauthnRevoke: "users/:id/webauthn/revoke",
} as const;
