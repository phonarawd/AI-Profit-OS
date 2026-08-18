/**
 * Phase0 in-process · NATS subject names identical at Phase1+.
 * Engine §48.13.4 — domain events only; Rule/R1~R10 never consume these as inputs.
 */

/** Emitted AFTER settlement ledger journal is posted (P7 → P7c). */
export const SETTLEMENT_EVENTS = {
  completed: "settlement.completed",
} as const;

export const MISSION_EVENTS = {
  accrualCreated: "mission.accrual.created",
  accrualQueuedPool: "mission.accrual.queued_pool",
  accrualReleased: "mission.accrual.released",
  accrualSkipped: "mission.accrual.skipped",
  benefitsUpdated: "benefits.updated",
} as const;
