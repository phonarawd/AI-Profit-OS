/** Phase0 in-process financial events (NATS subjects Phase1+ identical names) */

export const LEDGER_EVENTS = {
  journalPosted: "ledger.journal.posted",
  reconMismatch: "ledger.recon.mismatch",
  adminBalanceCredit: "admin.user.balance.credit",
  adminBalanceDebit: "admin.user.balance.debit",
  adminBalanceCorrect: "admin.user.balance.correct",
  /** §51.7 practice welcome / referee */
  practiceGranted: "ledger.practice.granted",
  practiceExpired: "ledger.practice.expired",
} as const;
