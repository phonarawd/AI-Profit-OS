/**
 * 운영자 all_public 상품은 사진 없음·benefit 도 회원 목록에 남긴다.
 * 필요자본 0/누락은 참여 거부. legacy_external 재개방 금지.
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

const operatorOnlyNoImage = {
  id: "0d433cbd-bf3d-4f94-b8c4-497483cdadae",
  supply_source: "operator",
  visibility: "all_public",
  status: "available",
  execution_mode: "orchestrate",
  asset_image_url: "",
  required_capital_usdt: "10",
  expected_profit_usdt: "1",
  expected_profit_krw_approx: null,
  arbitrage_type: "benefit",
  compareReady: false,
  selected_member_ids: [],
};

assert.equal(
  isOperatorMallMemberVisible(operatorOnlyNoImage, USER),
  true,
  "operator all_public no-image must be member-visible",
);
assert.equal(
  isOperatorMallMemberVisible(
    { ...operatorOnlyNoImage, supply_source: "legacy_external" },
    USER,
  ),
  false,
  "legacy_external must stay hidden",
);

const feed = buildBalanceAwareFeed({
  principalUsdt: "0",
  cards: [
    {
      id: operatorOnlyNoImage.id,
      requiredCapitalUsdt: "10",
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
  items.some((x) => x.id === operatorOnlyNoImage.id),
  true,
  "balance-aware list must keep operator no-image public product",
);
assert.equal(items[0].requiredCapitalUsdt, "10");

const ok = resolveParticipateAmountUsdt({
  amountUsdt: "10",
  requiredCapitalUsdt: "10",
});
assert.equal(ok.amountUsdt, "10");

const missingAmountUsesRequired = resolveParticipateAmountUsdt({
  amountUsdt: "",
  requiredCapitalUsdt: "10",
});
assert.equal(missingAmountUsesRequired.amountUsdt, "10");

let zeroRequired = null;
try {
  resolveParticipateAmountUsdt({
    amountUsdt: "0",
    requiredCapitalUsdt: "0",
  });
} catch (e) {
  zeroRequired = e;
}
assert.equal(zeroRequired && zeroRequired.code, "INVALID_AMOUNT");

let missingRequired = null;
try {
  resolveParticipateAmountUsdt({
    amountUsdt: "10",
    requiredCapitalUsdt: "",
  });
} catch (e) {
  missingRequired = e;
}
assert.equal(missingRequired && missingRequired.code, "INVALID_AMOUNT");

let mismatch = null;
try {
  resolveParticipateAmountUsdt({
    amountUsdt: "5",
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
  "[operator-mall-user-feed.runtime] PASS (list keeps operator no-image · participate capital > 0)",
);
