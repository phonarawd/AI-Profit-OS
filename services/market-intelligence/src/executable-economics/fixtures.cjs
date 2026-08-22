/**
 * Executable economics fixtures.
 * fixture ≠ live HTTP. 승격 핀 기하 + Day-1 market/FX만 가산한다.
 */

const { listing, CP_CARD } = require("../listing-promotion/fixtures.cjs");
const { CARD_IDENTITY } = require("../listing-variant-compatibility/fixtures.cjs");
const {
  composeFxSnapshot,
} = require("../fx-snapshot-formula.cjs");

const NOW = "2026-08-20T03:00:00.000Z";
const FRESH_OBSERVED_AT = "2026-08-20T02:58:00.000Z";
const STALE_OBSERVED_AT = "2026-08-19T12:00:00.000Z";

const FX_SNAPSHOT = composeFxSnapshot({
  fxSnapshotId: "fx_exec_fixture",
  capturedAt: NOW,
  primary: { usdtKrw: "1380" },
  marketplaceRaw: {
    usdtUsd: "0.999",
    usdGbp: "0.7856",
  },
});

function day1Listing(overrides) {
  return listing({
    canonicalProductId: CP_CARD,
    identity: { ...CARD_IDENTITY },
    variants: { grade: "PSA 10" },
    availability: "available",
    observedAt: FRESH_OBSERVED_AT,
    nativeAmount: "1000.00",
    nativeCurrency: "USD",
    ...overrides,
  });
}

const BUY_EBAY_US = day1Listing({
  listingId: "l_exec_buy_ebay_us",
  source: "ebay",
  marketId: "ebay_us",
  nativeAmount: "1000.00",
  nativeCurrency: "USD",
});

const SELL_ADMIN_USDT = day1Listing({
  listingId: "l_exec_sell_admin",
  source: "admin",
  marketId: "admin",
  nativeAmount: "1500.00",
  nativeCurrency: "USDT",
});

const cases = [
  {
    id: "pos-ebay-us-admin-wired",
    expect: "EXECUTABLE",
    expectReason: "WIRED_DAY1_ECONOMICS",
    left: BUY_EBAY_US,
    right: SELL_ADMIN_USDT,
    opts: {
      now: NOW,
      fxSnapshot: FX_SNAPSHOT,
      buyListingId: "l_exec_buy_ebay_us",
      sellListingId: "l_exec_sell_admin",
    },
  },
  {
    id: "pos-marketplace-id-ebay-gb-admin",
    expect: "EXECUTABLE",
    expectReason: "WIRED_DAY1_ECONOMICS",
    left: day1Listing({
      listingId: "l_exec_buy_ebay_gb",
      source: "ebay",
      marketplaceId: "EBAY_GB",
      nativeAmount: "800.00",
      nativeCurrency: "GBP",
    }),
    right: SELL_ADMIN_USDT,
    opts: {
      now: NOW,
      fxSnapshot: FX_SNAPSHOT,
      buyListingId: "l_exec_buy_ebay_gb",
      sellListingId: "l_exec_sell_admin",
    },
  },
  {
    id: "neg-promotable-tcg-ebay-no-day1-market",
    expect: "INSUFFICIENT",
    expectReason: "MARKET_ID_UNRESOLVED",
    expectPromotion: "PROMOTABLE",
    left: listing({
      listingId: "l_promo_card_left",
      source: "tcgplayer",
      canonicalProductId: CP_CARD,
      identity: { ...CARD_IDENTITY },
      variants: { grade: "PSA 10" },
      nativeAmount: "99.00",
      nativeCurrency: "USD",
      availability: "available",
      observedAt: FRESH_OBSERVED_AT,
    }),
    right: listing({
      listingId: "l_promo_card_right",
      source: "ebay",
      canonicalProductId: CP_CARD,
      identity: { ...CARD_IDENTITY },
      variants: { grade: "PSA10" },
      nativeAmount: "110.00",
      nativeCurrency: "USD",
      availability: "available",
      observedAt: FRESH_OBSERVED_AT,
      marketplaceId: "EBAY_US",
    }),
    opts: {
      now: NOW,
      fxSnapshot: FX_SNAPSHOT,
      buyListingId: "l_promo_card_left",
      sellListingId: "l_promo_card_right",
    },
  },
  {
    id: "neg-not-promotable-without-cp",
    expect: "NOT_EXECUTABLE",
    expectReason: "CANONICAL_PRODUCT_REQUIRED",
    left: listing({
      listingId: "l_exec_nocp_left",
      source: "ebay",
      marketId: "ebay_us",
      identity: { ...CARD_IDENTITY },
      variants: { grade: "PSA 10" },
      nativeAmount: "1000.00",
      nativeCurrency: "USD",
      availability: "available",
      observedAt: FRESH_OBSERVED_AT,
    }),
    right: listing({
      listingId: "l_exec_nocp_right",
      source: "admin",
      marketId: "admin",
      identity: { ...CARD_IDENTITY },
      variants: { grade: "PSA 10" },
      nativeAmount: "1500.00",
      nativeCurrency: "USDT",
      availability: "available",
      observedAt: FRESH_OBSERVED_AT,
    }),
    opts: {
      now: NOW,
      fxSnapshot: FX_SNAPSHOT,
      buyListingId: "l_exec_nocp_left",
      sellListingId: "l_exec_nocp_right",
    },
  },
  {
    id: "neg-stale-observed-price",
    expect: "NOT_EXECUTABLE",
    expectReason: "PRICE_STALE",
    left: { ...BUY_EBAY_US, observedAt: STALE_OBSERVED_AT },
    right: SELL_ADMIN_USDT,
    opts: {
      now: NOW,
      fxSnapshot: FX_SNAPSHOT,
      buyListingId: "l_exec_buy_ebay_us",
      sellListingId: "l_exec_sell_admin",
    },
  },
  {
    id: "neg-unavailable",
    expect: "NOT_EXECUTABLE",
    expectReason: "UNAVAILABLE",
    left: { ...BUY_EBAY_US, availability: "out_of_stock" },
    right: SELL_ADMIN_USDT,
    opts: {
      now: NOW,
      fxSnapshot: FX_SNAPSHOT,
      buyListingId: "l_exec_buy_ebay_us",
      sellListingId: "l_exec_sell_admin",
    },
  },
  {
    id: "neg-availability-unknown",
    expect: "INSUFFICIENT",
    expectReason: "AVAILABILITY_UNKNOWN",
    left: { ...BUY_EBAY_US, availability: "unknown" },
    right: SELL_ADMIN_USDT,
    opts: {
      now: NOW,
      fxSnapshot: FX_SNAPSHOT,
      buyListingId: "l_exec_buy_ebay_us",
      sellListingId: "l_exec_sell_admin",
    },
  },
  {
    id: "neg-missing-leg-assignment",
    expect: "INSUFFICIENT",
    expectReason: "LEG_ASSIGNMENT_REQUIRED",
    left: BUY_EBAY_US,
    right: SELL_ADMIN_USDT,
    opts: { now: NOW, fxSnapshot: FX_SNAPSHOT },
  },
  {
    id: "neg-missing-fx-snapshot",
    expect: "INSUFFICIENT",
    expectReason: "FX_SNAPSHOT_REQUIRED",
    left: BUY_EBAY_US,
    right: SELL_ADMIN_USDT,
    opts: {
      now: NOW,
      buyListingId: "l_exec_buy_ebay_us",
      sellListingId: "l_exec_sell_admin",
    },
  },
  {
    id: "neg-unsupported-currency",
    expect: "BLOCKED",
    expectReason: "FX_UNSUPPORTED_CURRENCY",
    left: { ...BUY_EBAY_US, nativeCurrency: "JPY" },
    right: SELL_ADMIN_USDT,
    opts: {
      now: NOW,
      fxSnapshot: FX_SNAPSHOT,
      buyListingId: "l_exec_buy_ebay_us",
      sellListingId: "l_exec_sell_admin",
    },
  },
  {
    id: "neg-localized-only-not-native",
    expect: "INSUFFICIENT",
    expectReason: "NATIVE_PRICE_UNPROVEN",
    left: { ...BUY_EBAY_US, priceSemantics: "localized_only" },
    right: SELL_ADMIN_USDT,
    opts: {
      now: NOW,
      fxSnapshot: FX_SNAPSHOT,
      buyListingId: "l_exec_buy_ebay_us",
      sellListingId: "l_exec_sell_admin",
    },
  },
  {
    id: "neg-ebay-source-does-not-default-us",
    expect: "INSUFFICIENT",
    expectReason: "MARKET_ID_UNRESOLVED",
    left: day1Listing({
      listingId: "l_exec_ebay_bare",
      source: "ebay",
      nativeAmount: "1000.00",
      nativeCurrency: "USD",
    }),
    right: SELL_ADMIN_USDT,
    opts: {
      now: NOW,
      fxSnapshot: FX_SNAPSHOT,
      buyListingId: "l_exec_ebay_bare",
      sellListingId: "l_exec_sell_admin",
    },
  },
  {
    id: "neg-same-day1-market",
    expect: "NOT_EXECUTABLE",
    expectReason: "ILLEGAL_LEG_PAIR",
    left: BUY_EBAY_US,
    right: day1Listing({
      listingId: "l_exec_sell_also_us",
      source: "admin",
      marketId: "ebay_us",
      nativeAmount: "1500.00",
      nativeCurrency: "USDT",
    }),
    opts: {
      now: NOW,
      fxSnapshot: FX_SNAPSHOT,
      buyListingId: "l_exec_buy_ebay_us",
      sellListingId: "l_exec_sell_also_us",
    },
  },
  {
    id: "neg-yahoo-not-day1",
    expect: "INSUFFICIENT",
    expectReason: "MARKET_ID_NOT_DAY1",
    left: day1Listing({
      listingId: "l_exec_yahoo",
      source: "yahoo_jp",
      marketId: "yahoo_jp",
      nativeAmount: "1000.00",
      nativeCurrency: "USDT",
    }),
    right: SELL_ADMIN_USDT,
    opts: {
      now: NOW,
      fxSnapshot: FX_SNAPSHOT,
      buyListingId: "l_exec_yahoo",
      sellListingId: "l_exec_sell_admin",
    },
  },
];

module.exports = {
  NOW,
  FRESH_OBSERVED_AT,
  STALE_OBSERVED_AT,
  FX_SNAPSHOT,
  BUY_EBAY_US,
  SELL_ADMIN_USDT,
  cases,
};
