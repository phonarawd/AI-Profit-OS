/**
 * Money §49.2a — deposit deeplink + suggest query parse.
 * suggestDepositUsdt formula = Engine §0.0.5.1 (pointer only · do not recompute here).
 */

export const DEPOSIT_PATH = "/wallet/deposit" as const;
export const DEPOSIT_QUICK_USDT = [10, 50, 100, 500] as const;
/** Classification / suggestDepositUsdt Owns — Engine plan pointer */
export const SUGGEST_DEPOSIT_OWNER = "engine:§0.0.5.1" as const;

export type DepositTab = "usdt" | "krw";

export type DepositSuggestQuery = {
  tab: DepositTab;
  /** Parsed suggestDepositUsdt · 0 means no prefill / no chip */
  suggestUsdt: number;
  oppId: string | null;
};

export type BuildDepositSuggestHrefInput = {
  suggestDepositUsdt: string | number;
  oppId: string;
  tab?: DepositTab;
};

/**
 * Canonical nearMiss / insufficient CTA href.
 * `/wallet/deposit?tab=usdt&suggest={suggestDepositUsdt}&oppId={id}`
 */
export function buildDepositSuggestHref(
  input: BuildDepositSuggestHrefInput,
): string {
  const tab: DepositTab = input.tab ?? "usdt";
  const suggest = normalizeSuggestAmount(input.suggestDepositUsdt);
  const params = new URLSearchParams();
  params.set("tab", tab);
  params.set("suggest", String(suggest));
  params.set("oppId", String(input.oppId ?? "").trim());
  return `${DEPOSIT_PATH}?${params.toString()}`;
}

export function parseDepositSuggestQuery(input: {
  tab?: string | null;
  suggest?: string | null;
  oppId?: string | null;
}): DepositSuggestQuery {
  const tab: DepositTab = input.tab === "krw" ? "krw" : "usdt";
  const suggestUsdt = normalizeSuggestAmount(input.suggest ?? "0");
  const oppRaw = String(input.oppId ?? "").trim();
  return {
    tab,
    suggestUsdt,
    oppId: oppRaw.length > 0 ? oppRaw : null,
  };
}

/** Day-1 quick chips · suggest chip appended when suggestUsdt > 0 and not already in list */
export function buildDepositQuickChips(suggestUsdt: number): number[] {
  const base = [...DEPOSIT_QUICK_USDT];
  if (suggestUsdt > 0 && !base.includes(suggestUsdt as (typeof DEPOSIT_QUICK_USDT)[number])) {
    return [suggestUsdt, ...base];
  }
  if (suggestUsdt > 0) {
    // already in quick list — still mark as suggest via UI data attr; order unchanged
    return base;
  }
  return base;
}

export function normalizeSuggestAmount(raw: string | number | null | undefined): number {
  if (raw == null || raw === "") return 0;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n) || n <= 0) return 0;
  // tick Day-1 = 1 USDT display floor (Engine owns ceil_to_tick; Money only sanitizes)
  return Math.max(1, Math.ceil(n));
}
