/**
 * Multi-source Opportunity fixtures.
 * fixture ≠ live HTTP. executable economics 핀 기하를 재사용하고 교차 소스만 가산한다.
 */

const {
  NOW,
  FX_SNAPSHOT,
  BUY_EBAY_US,
  SELL_ADMIN_USDT,
  cases: ECONOMICS_CASES,
} = require("../executable-economics/fixtures.cjs");

function mapEconomicsExpect(row) {
  if (row.expect === "EXECUTABLE") {
    return {
      expect: "ISSUED",
      expectReason: "MULTI_SOURCE_EXECUTABLE",
    };
  }
  if (row.expect === "INSUFFICIENT") {
    return { expect: "INSUFFICIENT", expectReason: row.expectReason };
  }
  if (row.expect === "BLOCKED") {
    return { expect: "BLOCKED", expectReason: row.expectReason };
  }
  if (row.expect === "CONFLICT") {
    return { expect: "CONFLICT", expectReason: row.expectReason };
  }
  return { expect: "NOT_ISSUED", expectReason: row.expectReason };
}

const SELL_EBAY_GB = {
  ...BUY_EBAY_US,
  listingId: "l_ms_sell_ebay_gb",
  source: "ebay",
  marketId: "ebay_gb",
  nativeAmount: "1200.00",
  nativeCurrency: "GBP",
};

const cases = [
  ...ECONOMICS_CASES.map((row) => ({
    id: row.id,
    ...mapEconomicsExpect(row),
    expectPromotion: row.expectPromotion,
    left: row.left,
    right: row.right,
    opts: row.opts,
  })),
  {
    id: "neg-same-source-ebay-us-gb",
    expect: "NOT_ISSUED",
    expectReason: "SAME_SOURCE",
    expectEconomics: "NOT_EXECUTABLE",
    left: BUY_EBAY_US,
    right: SELL_EBAY_GB,
    opts: {
      now: NOW,
      fxSnapshot: FX_SNAPSHOT,
      buyListingId: "l_exec_buy_ebay_us",
      sellListingId: "l_ms_sell_ebay_gb",
    },
  },
];

module.exports = {
  NOW,
  FX_SNAPSHOT,
  BUY_EBAY_US,
  SELL_ADMIN_USDT,
  SELL_EBAY_GB,
  cases,
};
