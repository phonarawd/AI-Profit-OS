/** Phase0 in-process · NATS subject names identical at Phase1+ */

export const WALLET_EVENTS = {
  depositConfigUpdated: "wallet.deposit_config.updated",
  depositDetected: "wallet.deposit.detected",
  depositConfirmed: "wallet.deposit.confirmed",
  depositReorgVoided: "wallet.deposit.reorg_voided",
  /**
   * §49.2a — after deposit confirmed · Engine §0.0.5.1 reclassify (Money emits only).
   * Phase0 in-process · Phase1+ same subject name.
   */
  feedCacheInvalidate: "wallet.feed.cache_invalidate",
  krwDepositPending: "wallet.krw_deposit.pending",
  krwDepositApproved: "wallet.krw_deposit.approved",
  krwDepositRejected: "wallet.krw_deposit.rejected",
  krwDepositExpired: "wallet.krw_deposit.expired",
  /** §49.3 */
  withdrawIntentCreated: "wallet.withdraw_intent.created",
  withdrawAdminApproved: "wallet.withdraw_intent.admin_approved",
  withdrawAdminRejected: "wallet.withdraw_intent.admin_rejected",
  /** §49.7 profit→principal */
  profitMerged: "wallet.profit.merged",
  /** §43.6a */
  withdrawPinReset: "wallet.withdraw_pin.reset",
  webauthnRevoked: "wallet.webauthn.revoked",
  /** §43.2 — user balance unchanged · Phase0 in-process */
  sweepCompleted: "wallet.sweep.completed",
  /** §43.2.1 Treasury TRX < min → Admin 🔴 */
  sweepPausedTrxLow: "wallet.sweep.paused_trx_low",
  /** §41.6 · §51.11 wrong-chain / 오입금 */
  depositDisputeSubmitted: "wallet.deposit_dispute.submitted",
  depositDisputeCredited: "wallet.deposit_dispute.credited",
  depositDisputeRejected: "wallet.deposit_dispute.rejected",
} as const;
