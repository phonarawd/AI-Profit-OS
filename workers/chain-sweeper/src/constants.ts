/**
 * §43.2 chain-sweeper constants — Phase0 Nest in-process · Phase1+ CF deploy.
 * “가스비 완전 무료” copy FORBIDDEN.
 */

/** Day-1 Treasury TRX stake floor (deposit-config.usdtOnchain.minTrxStakeForSweeper) */
export const DAY1_MIN_TRX_STAKE_FOR_SWEEPER = "5000";

/** CONFIRMED (ledger_credited) must age this many seconds before sweep */
export const SWEEP_GRACE_SEC = 60;

/** Below this USDT amount → skip sweep (dust) */
export const MIN_SWEEP_AMOUNT_USDT = "0.01";

/** Only this deposit status may enter the sweep queue */
export const SWEEP_ELIGIBLE_STATUS = "ledger_credited" as const;

/** DETECTED / pre-credit statuses — sweep FORBIDDEN */
export const SWEEP_FORBIDDEN_STATUSES = [
  "seen",
  "ui_confirmed",
  "ignored",
] as const;

export const SWEEPER_KEY_REF_ENV = "SWEEPER_KEYS_HSM_REF" as const;
