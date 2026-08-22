/**
 * V2 category profiles.
 * trading_card = 완전. sneakers/watch/luxury_bag = fixture용 skeleton.
 */

const {
  pairField,
  bothPresentDiffer,
  bothOwnerExact,
  ownerVsDerivedExact,
  bothDerivedOnly,
  evidenceRow,
  brandAndCategoryAgree,
  hasIndependentCorroboration,
} = require("./evidence.cjs");

function pushConflict(conflicts, rows, pair, extras) {
  const row = evidenceRow(pair, { ...extras, conflicting: true, strength: "CONFLICTING" });
  conflicts.push(row);
  rows.push(row);
}

function pushRow(rows, pair, extras) {
  const row = evidenceRow(pair, extras);
  rows.push(row);
  return row;
}

function evaluateTradingCard(assembled) {
  const conflicts = [];
  const rows = [];
  const set = pairField(assembled.left, assembled.right, "set");
  const cardNumber = pairField(assembled.left, assembled.right, "cardNumber");
  const game = pairField(assembled.left, assembled.right, "game");
  const character = pairField(assembled.left, assembled.right, "character");
  const language = pairField(assembled.left, assembled.right, "language");
  const finish = pairField(assembled.left, assembled.right, "finish");

  if (bothPresentDiffer(set)) {
    pushConflict(conflicts, rows, set);
  } else if (set.left || set.right) {
    pushRow(rows, set);
  }

  if (bothPresentDiffer(cardNumber)) {
    pushConflict(conflicts, rows, cardNumber);
  } else if (cardNumber.left || cardNumber.right) {
    pushRow(rows, cardNumber);
  }

  for (const pair of [game, character, language, finish]) {
    if (bothPresentDiffer(pair)) {
      pushConflict(conflicts, rows, pair);
    } else if (pair.left || pair.right) {
      pushRow(rows, pair);
    }
  }

  const strong =
    bothOwnerExact(set) &&
    bothOwnerExact(cardNumber) &&
    conflicts.length === 0 &&
    brandAndCategoryAgree(assembled);

  const compositeGeometry =
    ownerVsDerivedExact(set) &&
    ownerVsDerivedExact(cardNumber) &&
    !bothDerivedOnly(set) &&
    !bothDerivedOnly(cardNumber);

  const composite =
    compositeGeometry &&
    conflicts.length === 0 &&
    brandAndCategoryAgree(assembled) &&
    hasIndependentCorroboration(assembled);

  return {
    profile: "trading_card",
    conflicts,
    rows,
    strong,
    composite,
    titleOnlyDerived: bothDerivedOnly(set) || bothDerivedOnly(cardNumber),
  };
}

function evaluateSneakers(assembled) {
  const conflicts = [];
  const rows = [];
  const style = pairField(
    assembled.left,
    assembled.right,
    "manufacturerStyleCode",
  );
  const brand = pairField(assembled.left, assembled.right, "brand");

  if (bothPresentDiffer(style)) {
    pushConflict(conflicts, rows, style);
  } else if (style.left || style.right) {
    pushRow(rows, style);
  }

  if (bothPresentDiffer(brand)) {
    pushConflict(conflicts, rows, brand);
  } else if (brand.left || brand.right) {
    pushRow(rows, brand);
  }

  return {
    profile: "sneakers",
    conflicts,
    rows,
    strong: false,
    composite: false,
    titleOnlyDerived: false,
  };
}

function evaluateWatch() {
  return {
    profile: "watch",
    conflicts: [],
    rows: [],
    strong: false,
    composite: false,
    titleOnlyDerived: false,
  };
}

function evaluateLuxuryBag() {
  return {
    profile: "luxury_bag",
    conflicts: [],
    rows: [],
    strong: false,
    composite: false,
    titleOnlyDerived: false,
  };
}

function evaluateUnknown() {
  return {
    profile: "unknown",
    conflicts: [],
    rows: [],
    strong: false,
    composite: false,
    titleOnlyDerived: false,
  };
}

function evaluateProfile(assembled) {
  if (assembled.pairProfile === "trading_card") {
    return evaluateTradingCard(assembled);
  }
  if (assembled.pairProfile === "sneakers") {
    return evaluateSneakers(assembled);
  }
  if (assembled.pairProfile === "watch") {
    return evaluateWatch(assembled);
  }
  if (assembled.pairProfile === "luxury_bag") {
    return evaluateLuxuryBag(assembled);
  }
  return evaluateUnknown(assembled);
}

module.exports = { evaluateProfile };
