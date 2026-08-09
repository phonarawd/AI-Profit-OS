/**
 * §43.1 confirmation stages — mirrors workers/chain-watchers confirmation-tracker.
 * Phase0 SoT for credit gating inside Nest (emit=in-process).
 */

export const CHAIN_WATCHER_MODE = "event_stream" as const;
export const USDT_UI_CONFIRMATIONS = 1 as const;
export const USDT_LEDGER_CONFIRMATIONS = 19 as const;
export const USDT_DUST_MIN = "0.01";

export type DepositStage =
  | "unseen"
  | "detected"
  | "confirmed"
  | "reorg_void";

export type StageDecision = {
  stage: DepositStage;
  emitDetected: boolean;
  emitConfirmed: boolean;
  /** true only at ≥19 conf — Double-Entry allowed */
  creditLedger: boolean;
  voidDetected: boolean;
  uiConfirmations: typeof USDT_UI_CONFIRMATIONS;
  ledgerConfirmations: typeof USDT_LEDGER_CONFIRMATIONS;
};

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
