/** §43.1 · §41 — USDT TRC20 single-stream watcher constants (Day-1 free path) */

export const CHAIN_WATCHER_MODE = "event_stream" as const;

/** 1 confirmation → UI toast only · ledger 분개 없음 */
export const USDT_UI_CONFIRMATIONS = 1 as const;

/** 19 confirmations → Double-Entry credit */
export const USDT_LEDGER_CONFIRMATIONS = 19 as const;

/** Mainnet USDT TRC20 */
export const USDT_TRC20_CONTRACT =
  "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t" as const;

export const DEFAULT_TRONGRID_BASE = "https://api.trongrid.io" as const;

/** Ignore dust below this (USDT string decimal) */
export const USDT_DUST_MIN = "0.01";

/** TronGrid free-tier budget defaults */
export const TRONGRID_QPS_BUDGET = 12;
export const TRONGRID_DAILY_BUDGET = 80_000;
