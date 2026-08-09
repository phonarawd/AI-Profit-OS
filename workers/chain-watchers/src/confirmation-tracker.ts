/**
 * §43.1 confirmation-tracker — 1 → DETECTED (UI) · 19 → CONFIRMED (ledger).
 * Ledger credit before N confirmations FORBIDDEN.
 */

import {
  USDT_LEDGER_CONFIRMATIONS,
  USDT_UI_CONFIRMATIONS,
} from "./constants";

export type DepositStage =
  | "unseen"
  | "detected"
  | "confirmed"
  | "reorg_void";

export type StageDecision = {
  stage: DepositStage;
  /** Toast / bus: DEPOSIT_DETECTED — no ledger */
  emitDetected: boolean;
  /** Toast / bus: DEPOSIT_CONFIRMED — Double-Entry required */
  emitConfirmed: boolean;
  /** ledger postJournal(deposit_usdt) allowed only when true */
  creditLedger: boolean;
  /** Void DETECTED observation (pre-ledger only) */
  voidDetected: boolean;
  uiConfirmations: typeof USDT_UI_CONFIRMATIONS;
  ledgerConfirmations: typeof USDT_LEDGER_CONFIRMATIONS;
};

/**
 * Pure stage machine from confirmation count (+ optional reorg flag).
 * Does not touch DB or ledger — Nest/Worker apply side effects.
 */
export function decideDepositStage(input: {
  confirmations: number;
  reorg?: boolean;
  alreadyLedgerCredited?: boolean;
}): StageDecision {
  const ui = USDT_UI_CONFIRMATIONS;
  const ledger = USDT_LEDGER_CONFIRMATIONS;
  const base = {
    uiConfirmations: ui,
    ledgerConfirmations: ledger,
  } as const;

  if (input.alreadyLedgerCredited) {
    return {
      ...base,
      stage: "confirmed",
      emitDetected: false,
      emitConfirmed: false,
      creditLedger: false,
      voidDetected: false,
    };
  }

  if (input.reorg) {
    return {
      ...base,
      stage: "reorg_void",
      emitDetected: false,
      emitConfirmed: false,
      creditLedger: false,
      voidDetected: true,
    };
  }

  const conf = Math.max(0, Math.floor(Number(input.confirmations) || 0));

  if (conf >= ledger) {
    return {
      ...base,
      stage: "confirmed",
      emitDetected: false,
      emitConfirmed: true,
      creditLedger: true,
      voidDetected: false,
    };
  }

  if (conf >= ui) {
    return {
      ...base,
      stage: "detected",
      emitDetected: true,
      emitConfirmed: false,
      creditLedger: false,
      voidDetected: false,
    };
  }

  return {
    ...base,
    stage: "unseen",
    emitDetected: false,
    emitConfirmed: false,
    creditLedger: false,
    voidDetected: false,
  };
}

/** Explicit guard used by verify + callers */
export function ledgerAllowedAtConfirmations(confirmations: number): boolean {
  return decideDepositStage({ confirmations }).creditLedger === true;
}
