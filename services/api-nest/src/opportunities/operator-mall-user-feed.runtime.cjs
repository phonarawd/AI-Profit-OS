/**
 * 운영자 all_public 상품은 사진 없음·자본 0·benefit 도 회원 목록에 남긴다.
 * legacy_external 재개방 금지. 참여 0원은 지급 창작 없이 허용.
 */
"use strict";

const assert = require("node:assert/strict");
const {
  buildBalanceAwareFeed,
} = require("../../../market-intelligence/src/balance-aware-feed.cjs");
const { resolveParticipateAmountUsdt } = require("./participate-amount.cjs");

const USER = "11111111-1111-4111-8111-111111111111";

function isOperatorMallMemberVisible(row, userId) {
  if (!row || row.supply_source !== "operator") return false;
  const vis = row.visibility || "all_public";
  if (vis === "private") return false;
  if (vis === "selected_members") {
    const ids = Array.isArray(row.selected_member_ids)
      ? row.selected_member_ids
      : [];
    return ids.includes(userId);
  }
  return true;
}

const operatorOnlyNoImageCapital0 = {
  id: "0d433cbd-bf3d-4f94-b8c4-497483cdadae",
  supply_source: "operator",
  visibility: "all_public",
  status: "available",
  execution_mode: "orchestrate",
  asset_image_url: "",
  required_capital_usdt: "0",
  expected_profit_usdt: "1",
  arbitrage_type: "benefit",
  compareReady: false,
  selected_member_ids: [],
};

assert.equal(
  isOperatorMallMemberVisible(operatorOnlyNoImageCapital0, USER),
  true,
  "operator all_public no-image capital-0 must be member-visible",
);
assert.equal(
  isOperatorMallMemberVisible(
    { ...operatorOnlyNoImageCapital0, supply_source: "legacy_external" },
    USER,
  ),
  false,
  "legacy_external must stay hidden",
);

const feed = buildBalanceAwareFeed({
  principalUsdt: "0",
  cards: [
    {
      id: operatorOnlyNoImageCapital0.id,
      requiredCapitalUsdt: "0",
      expectedProfitUsdt: "1",
      compareReady: false,
      capitalBand: null,
      aiPick: false,
      marginPct: null,
      status: "available",
    },
  ],
});
const items = feed.items || [];
assert.equal(
  items.some((x) => x.id === operatorOnlyNoImageCapital0.id),
  true,
  "balance-aware list must keep operator capital-0 public product",
);
assert.equal(items[0].requiredCapitalUsdt, "0");

const zero = resolveParticipateAmountUsdt({
  amountUsdt: "0",
  requiredCapitalUsdt: "0",
});
assert.equal(zero.amountUsdt, "0");

const missingTreatedAsRequired = resolveParticipateAmountUsdt({
  amountUsdt: "",
  requiredCapitalUsdt: "0",
});
assert.equal(missingTreatedAsRequired.amountUsdt, "0");

let mismatch = null;
try {
  resolveParticipateAmountUsdt({
    amountUsdt: "0",
    requiredCapitalUsdt: "10",
  });
} catch (e) {
  mismatch = e;
}
assert.equal(mismatch && mismatch.code, "AMOUNT_MISMATCH");

let negative = null;
try {
  resolveParticipateAmountUsdt({
    amountUsdt: "-1",
    requiredCapitalUsdt: "-1",
  });
} catch (e) {
  negative = e;
}
assert.equal(negative && negative.code, "INVALID_AMOUNT");

console.log(
  "[operator-mall-user-feed.runtime] PASS (list keeps operator no-image capital-0 · participate 0)",
);
