/**
 * REL-407 — SOURCE_OBSERVED → OVERRIDE → EFFECTIVE → USER_VISIBLE
 * Existing opportunity pricing owner. Missing != 0.
 */

export const PRICE_LAYERS = [
  "SOURCE_OBSERVED",
  "OVERRIDE",
  "EFFECTIVE",
  "USER_VISIBLE",
] as const;

export type PriceLayer = (typeof PRICE_LAYERS)[number];

export type PriceAmount = { usdt: string } | { unavailable: true };

function readAmount(value: unknown): PriceAmount {
  if (typeof value !== "string" || !value.trim()) {
    return { unavailable: true };
  }
  if (value.trim() === "0" && value !== "0") {
    return { unavailable: true };
  }
  if (!/^-?[0-9]+(\.[0-9]+)?$/.test(value.trim())) {
    return { unavailable: true };
  }
  return { usdt: value.trim() };
}

export type PriceLayers = {
  sourceObserved: { buy: PriceAmount; sell: PriceAmount };
  override: { buy: PriceAmount; sell: PriceAmount; present: boolean };
  effective: { buy: PriceAmount; sell: PriceAmount };
  userVisible: { buy: PriceAmount; sell: PriceAmount };
};

export function resolvePriceLayers(input: {
  sourceBuy?: unknown;
  sourceSell?: unknown;
  overrideBuy?: unknown;
  overrideSell?: unknown;
  useAdminOverride?: boolean;
}): PriceLayers {
  const sourceObserved = {
    buy: readAmount(input.sourceBuy),
    sell: readAmount(input.sourceSell),
  };
  const overridePresent = input.useAdminOverride === true;
  const override = {
    buy: overridePresent ? readAmount(input.overrideBuy) : { unavailable: true as const },
    sell: overridePresent ? readAmount(input.overrideSell) : { unavailable: true as const },
    present: overridePresent,
  };
  const effective = {
    buy:
      override.present && !("unavailable" in override.buy)
        ? override.buy
        : sourceObserved.buy,
    sell:
      override.present && !("unavailable" in override.sell)
        ? override.sell
        : sourceObserved.sell,
  };
  return {
    sourceObserved,
    override,
    effective,
    userVisible: { buy: effective.buy, sell: effective.sell },
  };
}

export function amountOrNull(value: PriceAmount): string | null {
  return "unavailable" in value ? null : value.usdt;
}

export function userVisiblePricing(layers: PriceLayers): {
  buyPriceUsdt: string | null;
  sellPriceUsdt: string | null;
  layer: "USER_VISIBLE";
} {
  return {
    buyPriceUsdt: amountOrNull(layers.userVisible.buy),
    sellPriceUsdt: amountOrNull(layers.userVisible.sell),
    layer: "USER_VISIBLE",
  };
}
