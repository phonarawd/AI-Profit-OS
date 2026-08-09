/**
 * Referral API paths · Money §51.5
 * Admin UI Owns=/admin/growth?tab=referral · contracts Owns=Money
 * User copy Owns=UI §5.9.1a
 */

export const REFERRAL_USER_ROUTES = {
  /** GET — /me/invite summary */
  me: "referral/me",
  /** POST — manual code bind (1회) */
  bind: "referral/bind",
  /** POST — share attempt (spam counter only) */
  share: "referral/share",
} as const;

export const REFERRAL_ADMIN_ROUTES = {
  /** GET/PATCH — program config · rewardsEnabled · %/캡 · NO monthly invite cap */
  program: "growth/referral/program",
  programAudit: "growth/referral/program/audit",
  /** POST — Promo Pool top-up (margin-funded) */
  poolTopUp: "growth/referral/pool/top-up",
  /** GET — Promo Pool balance + queue depths */
  poolStatus: "growth/referral/pool",
  /** GET — held_risk · queued_pool queue */
  holdQueue: "growth/referral/hold-queue",
  /** POST — 1-click release after review */
  release: "growth/referral/edges/:edgeId/release",
  /** POST — clawback */
  clawback: "growth/referral/edges/:edgeId/clawback",
  /** POST — accrual halt / resume */
  accrualHalt: "growth/referral/accrual-halt",
  /** GET — edges for user 360 referral tab */
  userEdges: "growth/referral/users/:userId/edges",
} as const;
