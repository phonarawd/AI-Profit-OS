/**
 * Money §41.6 — ledger/admin network code ↔ user plain-ko label.
 * Watcher/ledger keep TRC20 · user surfaces must use USER_NETWORK_LABEL_KO only.
 */

export const LEDGER_NETWORK_CODE = "TRC20" as const;
export type LedgerNetworkCode = typeof LEDGER_NETWORK_CODE;

/** User-facing short name (withdraw confirm · badges) */
export const USER_NETWORK_LABEL_KO = "트론" as const;

/** User-facing phrase in §41.6 warning */
export const USER_NETWORK_PHRASE_KO = "트론 네트워크" as const;

const CODE_TO_USER: Record<string, string> = {
  [LEDGER_NETWORK_CODE]: USER_NETWORK_LABEL_KO,
  TRON: USER_NETWORK_LABEL_KO,
};

/** Map ledger/admin code → Korean label for user UI. Unknown → 트론 (Day-1 only). */
export function networkLabelForUser(code?: string | null): string {
  if (!code) return USER_NETWORK_LABEL_KO;
  const hit = CODE_TO_USER[code.trim().toUpperCase()];
  return hit ?? USER_NETWORK_LABEL_KO;
}

/** True when a user-rendered string illegally contains ledger jargon. */
export function containsForbiddenNetworkJargon(text: string): boolean {
  return /\bTRC20\b|\bERC20\b|\bBEP20\b/i.test(text);
}
