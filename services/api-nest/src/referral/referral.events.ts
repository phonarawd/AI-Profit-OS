/** Phase0 in-process referral events (NATS subjects Phase1+ identical names) */

export const REFERRAL_EVENTS = {
  edgeBound: "referral.edge.bound",
  l2Pending: "referral.l2.pending",
  l2QueuedPool: "referral.l2.queued_pool",
  l2Released: "referral.l2.released",
  l3Done: "referral.l3.done",
  clawback: "referral.clawback",
  heldRisk: "referral.held_risk",
  poolTopUp: "referral.pool.top_up",
  programUpdated: "referral.program.updated",
  accrualHalted: "referral.accrual.halted",
  shareLimited: "referral.share.limited",
} as const;
