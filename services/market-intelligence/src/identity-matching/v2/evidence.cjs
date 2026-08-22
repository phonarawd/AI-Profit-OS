/**
 * V2 evidence assembler.
 * DERIVED는 title에서만. OWNER_BACKED로 승격 금지.
 * set 닫힌 사전 없음 — owner 값을 앵커로 반대쪽 title exact phrase만 본다.
 */

const {
  asString,
  normalizeText,
  normalizeIdentifierValue,
  extractTypedIdentifiers,
  extractSourceLocal,
  matchingDecisionEligible,
} = require("../normalize.cjs");

const OWNER_BACKED_STRUCTURED = "OWNER_BACKED_STRUCTURED";
const DERIVED_STRUCTURED = "DERIVED_STRUCTURED";
const PRESENTATION_ONLY = "PRESENTATION_ONLY";

const ANCHOR_FIELDS = [
  "set",
  "cardNumber",
  "game",
  "character",
  "manufacturerStyleCode",
];

const MVP_PROFILES = Object.freeze([
  "trading_card",
  "sneakers",
  "watch",
  "luxury_bag",
]);

function metaOf(obs) {
  return obs && obs.meta && typeof obs.meta === "object" ? obs.meta : {};
}

function hintsOf(obs) {
  const meta = metaOf(obs);
  return meta.identityHints && typeof meta.identityHints === "object"
    ? meta.identityHints
    : {};
}

function normForField(field, value) {
  if (
    field === "cardNumber" ||
    field === "manufacturerStyleCode" ||
    field === "GTIN" ||
    field === "MPN" ||
    field === "WATCH_REFERENCE"
  ) {
    return normalizeIdentifierValue(value);
  }
  return normalizeText(value);
}

function ownerItem(obs, field, value, provenanceFamily) {
  const raw = asString(value);
  if (!raw) return null;
  return {
    value: raw,
    normalizedValue: normForField(field, raw),
    evidenceOwner: OWNER_BACKED_STRUCTURED,
    derivedFrom: null,
    extractor: null,
    provenanceFamily: provenanceFamily || `structured:${field}`,
    source: asString(obs && obs.source) || null,
    observationId: asString(obs && obs.id) || null,
  };
}

function derivedItem(obs, field, value, extractor) {
  const raw = asString(value);
  if (!raw) return null;
  return {
    value: raw,
    normalizedValue: normForField(field, raw),
    evidenceOwner: DERIVED_STRUCTURED,
    derivedFrom: "title",
    extractor,
    provenanceFamily: "title",
    source: asString(obs && obs.source) || null,
    observationId: asString(obs && obs.id) || null,
  };
}

function emptySide(obs) {
  return {
    value: null,
    normalizedValue: null,
    evidenceOwner: null,
    derivedFrom: null,
    extractor: null,
    provenanceFamily: null,
    source: asString(obs && obs.source) || null,
    observationId: asString(obs && obs.id) || null,
  };
}

function titleContainsNormalizedPhrase(title, rawValue) {
  const hay = normalizeText(title);
  const needle = normalizeText(rawValue);
  if (!hay || !needle) return false;
  return ` ${hay} `.includes(` ${needle} `);
}

function titleHasExactValue(title, raw, field) {
  if (titleContainsNormalizedPhrase(title, raw)) return true;
  if (field === "cardNumber" || field === "manufacturerStyleCode") {
    const id = normalizeIdentifierValue(raw);
    const compact = normalizeIdentifierValue(title);
    return Boolean(id && compact && compact.includes(id));
  }
  return false;
}

function isSneakerStyleAspect(value) {
  const n = normalizeText(value);
  return (
    n === "sneaker" ||
    n === "sneakers" ||
    n === "athletic" ||
    n === "shoe" ||
    n === "shoes"
  );
}

function isTradingCardCategoryHint(rawHint) {
  const hint = normalizeText(rawHint);
  if (!hint) return false;
  if (hint === "trading_card") return true;
  return (
    /\btrading cards?\b/.test(hint) ||
    /\bcollectible card games?\b/.test(hint) ||
    /\bccg individual cards?\b/.test(hint) ||
    /\bsports trading cards?\b/.test(hint) ||
    /\bnon sport trading cards?\b/.test(hint)
  );
}

function hasOwnerTradingCardGeometry(obs) {
  const hints = hintsOf(obs);
  return Boolean(
    asString(hints.game) &&
      asString(hints.set) &&
      asString(hints.cardNumber || hints.number),
  );
}

function resolveSingleProfileV2(obs) {
  const hints = hintsOf(obs);
  const explicit = normalizeText(hints.categoryProfile);
  if (MVP_PROFILES.includes(explicit)) return explicit;

  const rawHint = metaOf(obs).categoryHint;
  const hint = normalizeText(rawHint);
  if (isTradingCardCategoryHint(rawHint)) return "trading_card";
  if (hint === "sneakers" || /\bsneakers?\b/.test(hint)) return "sneakers";
  if (
    /\bwristwatch/.test(hint) ||
    /\bwrist watches\b/.test(hint) ||
    /\bwatches\b/.test(hint)
  ) {
    return "watch";
  }
  if (/\bbags?\b/.test(hint) && /\bhandbags?\b/.test(hint)) return "luxury_bag";
  if (/\bluxury bag/.test(hint)) return "luxury_bag";
  if (hasOwnerTradingCardGeometry(obs)) return "trading_card";
  return "unknown";
}

function resolvePairProfileV2(leftObs, rightObs) {
  const left = resolveSingleProfileV2(leftObs);
  const right = resolveSingleProfileV2(rightObs);
  if (left !== "unknown" && right !== "unknown" && left !== right) {
    return { profile: "unknown", conflict: true, left, right };
  }
  if (left !== "unknown" && left === right) {
    return { profile: left, conflict: false, left, right };
  }
  if (left !== "unknown") {
    return { profile: left, conflict: false, left, right };
  }
  if (right !== "unknown") {
    return { profile: right, conflict: false, left, right };
  }
  return { profile: "unknown", conflict: false, left, right };
}

function collectOwnerBacked(obs) {
  const meta = metaOf(obs);
  const hints = hintsOf(obs);
  const owner = {};

  owner.brand = ownerItem(obs, "brand", meta.brand, "structured:brand");
  owner.category = ownerItem(
    obs,
    "category",
    hints.categoryProfile || meta.categoryHint,
    "structured:category",
  );
  owner.set = ownerItem(obs, "set", hints.set, "structured:set");
  owner.cardNumber = ownerItem(
    obs,
    "cardNumber",
    hints.cardNumber || hints.number,
    "structured:cardNumber",
  );
  owner.game = ownerItem(obs, "game", hints.game, "structured:game");
  owner.character = ownerItem(
    obs,
    "character",
    hints.character || hints.name,
    "structured:character",
  );
  owner.language = ownerItem(
    obs,
    "language",
    hints.language || hints.lang,
    "structured:language",
  );
  owner.finish = ownerItem(obs, "finish", hints.finish, "structured:finish");

  const styleCode = hints.manufacturerStyleCode || hints.styleCode;
  if (styleCode && !isSneakerStyleAspect(styleCode)) {
    owner.manufacturerStyleCode = ownerItem(
      obs,
      "manufacturerStyleCode",
      styleCode,
      "structured:manufacturerStyleCode",
    );
  } else {
    owner.manufacturerStyleCode = null;
  }

  return owner;
}

function collectTypedOwner(obs, identifiers) {
  const extra = {};
  for (const id of identifiers) {
    extra[id.type] = {
      value: id.value,
      normalizedValue: id.value,
      evidenceOwner: OWNER_BACKED_STRUCTURED,
      derivedFrom: null,
      extractor: null,
      provenanceFamily: `structured:${id.type}`,
      source: asString(obs && obs.source) || null,
      observationId: asString(obs && obs.id) || null,
      brand: id.brand || "",
      provenance: id.provenance,
    };
  }
  return extra;
}

function collectLocal(obs) {
  const local = extractSourceLocal(obs);
  const meta = metaOf(obs);
  const hints = hintsOf(obs);
  return {
    externalItemId: local.externalItemId,
    sku: local.sku,
    epid: local.epid,
    inferredEpid: local.inferredEpid,
    skuDerivedBarcode: asString(hints.skuDerivedBarcode) || null,
    chrono24ProductId:
      asString(obs && obs.source) === "chrono24"
        ? asString(obs && obs.externalItemId) || null
        : null,
    fashionphileSku:
      asString(obs && obs.source) === "fashionphile"
        ? asString(meta.sku) || local.sku
        : null,
  };
}

function collectSide(obs) {
  const identifiers = extractTypedIdentifiers(obs);
  return {
    id: asString(obs && obs.id) || null,
    source: asString(obs && obs.source) || null,
    title: asString(obs && obs.title) || null,
    observationPurpose: asString(obs && obs.observationPurpose) || null,
    sourceStatus: asString(obs && obs.sourceStatus) || null,
    owner: collectOwnerBacked(obs),
    derived: {},
    typed: collectTypedOwner(obs, identifiers),
    identifiers,
    sourceLocal: collectLocal(obs),
    singleProfile: resolveSingleProfileV2(obs),
    imageUrl: asString(obs && obs.imageUrl) || null,
  };
}

function applyOwnerAnchoredDerivation(left, right) {
  for (const field of ANCHOR_FIELDS) {
    if (left.owner[field] && !right.owner[field] && !right.derived[field]) {
      if (titleHasExactValue(right.title, left.owner[field].value, field)) {
        right.derived[field] = derivedItem(
          { id: right.id, source: right.source },
          field,
          left.owner[field].value,
          "owner_anchored_exact_phrase",
        );
      }
    }
    if (right.owner[field] && !left.owner[field] && !left.derived[field]) {
      if (titleHasExactValue(left.title, right.owner[field].value, field)) {
        left.derived[field] = derivedItem(
          { id: left.id, source: left.source },
          field,
          right.owner[field].value,
          "owner_anchored_exact_phrase",
        );
      }
    }
  }
}

const CARD_NUMBER_RE = /\b(\d{1,3})\s*\/\s*(\d{1,3})\b/;
const STYLE_CODE_RE = /\b[A-Z]{2}\d{4}-\d{3}\b/i;

function applyGenericCardNumber(side) {
  if (side.owner.cardNumber || side.derived.cardNumber) return;
  const m = String(side.title || "").match(CARD_NUMBER_RE);
  if (!m) return;
  side.derived.cardNumber = derivedItem(
    { id: side.id, source: side.source },
    "cardNumber",
    `${m[1]}/${m[2]}`,
    "card_number_slash",
  );
}

function applyGenericStyleCode(side, pairLooksSneaker) {
  if (!pairLooksSneaker) return;
  if (side.owner.manufacturerStyleCode || side.derived.manufacturerStyleCode) {
    return;
  }
  const m = String(side.title || "").match(STYLE_CODE_RE);
  if (!m) return;
  if (isSneakerStyleAspect(m[0])) return;
  side.derived.manufacturerStyleCode = derivedItem(
    { id: side.id, source: side.source },
    "manufacturerStyleCode",
    m[0].toUpperCase(),
    "style_code_pattern",
  );
}

function pickField(side, field) {
  return side.owner[field] || side.derived[field] || null;
}

function pairField(left, right, field) {
  return {
    field,
    left: pickField(left, field),
    right: pickField(right, field),
  };
}

function valuesEqual(a, b) {
  if (!a || !b) return false;
  return a.normalizedValue === b.normalizedValue && Boolean(a.normalizedValue);
}

function bothPresentDiffer(pair) {
  return Boolean(
    pair.left &&
      pair.right &&
      pair.left.normalizedValue &&
      pair.right.normalizedValue &&
      pair.left.normalizedValue !== pair.right.normalizedValue,
  );
}

function isOwner(side) {
  return Boolean(side && side.evidenceOwner === OWNER_BACKED_STRUCTURED);
}

function isDerived(side) {
  return Boolean(side && side.evidenceOwner === DERIVED_STRUCTURED);
}

function ownerVsDerivedExact(pair) {
  if (!valuesEqual(pair.left, pair.right)) return false;
  const owners = [pair.left, pair.right].filter(isOwner);
  const derived = [pair.left, pair.right].filter(isDerived);
  return owners.length >= 1 && derived.length >= 1;
}

function bothOwnerExact(pair) {
  return valuesEqual(pair.left, pair.right) && isOwner(pair.left) && isOwner(pair.right);
}

function bothDerivedOnly(pair) {
  return valuesEqual(pair.left, pair.right) && isDerived(pair.left) && isDerived(pair.right);
}

function comparisonOf(pair) {
  if (!pair.left && !pair.right) return "missing";
  if (!pair.left || !pair.right) return "missing";
  if (valuesEqual(pair.left, pair.right)) return "exact";
  return "mismatch";
}

function strengthOf(pair, { conflicting = false, notComparable = false } = {}) {
  if (notComparable) return "NOT_COMPARABLE";
  if (conflicting || comparisonOf(pair) === "mismatch") return "CONFLICTING";
  if (bothOwnerExact(pair) && (pair.field === "GTIN" || pair.field === "gtin")) {
    return "AUTHORITATIVE_STRONG";
  }
  if (bothOwnerExact(pair)) return "STRONG";
  if (ownerVsDerivedExact(pair)) return "COMPOSITE_STRONG";
  if (comparisonOf(pair) === "exact") return "CORROBORATING";
  if (comparisonOf(pair) === "missing") return "NOT_COMPARABLE";
  return "CORROBORATING";
}

function evidenceRow(pair, extras) {
  const leftObs = extras && extras.leftObs;
  const rightObs = extras && extras.rightObs;
  return {
    field: pair.field,
    left: pair.left || emptySide(leftObs),
    right: pair.right || emptySide(rightObs),
    comparison: extras && extras.comparison ? extras.comparison : comparisonOf(pair),
    strength:
      extras && extras.strength
        ? extras.strength
        : strengthOf(pair, extras || {}),
  };
}

function uniqueProvenanceFamilies(sides) {
  const families = new Set();
  for (const side of sides) {
    if (side && side.provenanceFamily) families.add(side.provenanceFamily);
  }
  return families;
}

function assemblePairEvidence(leftObs, rightObs, opts) {
  const left = collectSide(leftObs);
  const right = collectSide(rightObs);
  const pairInfo = resolvePairProfileV2(leftObs, rightObs);
  applyOwnerAnchoredDerivation(left, right);
  applyGenericCardNumber(left);
  applyGenericCardNumber(right);
  const pairLooksSneaker =
    pairInfo.profile === "sneakers" ||
    left.singleProfile === "sneakers" ||
    right.singleProfile === "sneakers" ||
    Boolean(left.owner.manufacturerStyleCode) ||
    Boolean(right.owner.manufacturerStyleCode);
  applyGenericStyleCode(left, pairLooksSneaker);
  applyGenericStyleCode(right, pairLooksSneaker);

  const brandLeft = left.owner.brand;
  const brandRight = right.owner.brand;
  const brandConflict = Boolean(
    brandLeft &&
      brandRight &&
      brandLeft.normalizedValue &&
      brandRight.normalizedValue &&
      brandLeft.normalizedValue !== brandRight.normalizedValue,
  );

  return {
    left,
    right,
    pairProfile: pairInfo.profile,
    categoryConflict: pairInfo.conflict,
    resolvedLeftProfile: pairInfo.left,
    resolvedRightProfile: pairInfo.right,
    brandConflict,
    eligible: matchingDecisionEligible(leftObs, rightObs),
    allowSyntheticImageEvidence: Boolean(
      opts && opts.allowSyntheticImageEvidence === true,
    ),
    syntheticImageCorroboration: Boolean(opts && opts.imageCorroboration === true),
  };
}

function ownerCategoryResolvesTradingCard(side, resolvedProfile) {
  return isOwner(side.owner.category) && resolvedProfile === "trading_card";
}

function crossSideStructuredProfileCorroboration(assembled) {
  if (assembled.pairProfile !== "trading_card") return false;
  if (assembled.categoryConflict) return false;
  const leftGame = isOwner(assembled.left.owner.game);
  const rightGame = isOwner(assembled.right.owner.game);
  const leftCat = ownerCategoryResolvesTradingCard(
    assembled.left,
    assembled.resolvedLeftProfile,
  );
  const rightCat = ownerCategoryResolvesTradingCard(
    assembled.right,
    assembled.resolvedRightProfile,
  );
  return (leftGame && rightCat) || (rightGame && leftCat);
}

function independentStructuredCorroboration(assembled) {
  const game = pairField(assembled.left, assembled.right, "game");
  if (bothOwnerExact(game)) return { ok: true, field: "game" };

  const leftCategory = assembled.left.owner.category;
  const rightCategory = assembled.right.owner.category;
  if (
    isOwner(leftCategory) &&
    isOwner(rightCategory) &&
    assembled.resolvedLeftProfile !== "unknown" &&
    assembled.resolvedLeftProfile === assembled.resolvedRightProfile &&
    !assembled.categoryConflict
  ) {
    return { ok: true, field: "category" };
  }

  if (crossSideStructuredProfileCorroboration(assembled)) {
    return { ok: true, field: "CROSS_SIDE_STRUCTURED_PROFILE_CORROBORATION" };
  }

  const character = pairField(assembled.left, assembled.right, "character");
  if (bothOwnerExact(character)) return { ok: true, field: "character" };
  const language = pairField(assembled.left, assembled.right, "language");
  if (bothOwnerExact(language)) return { ok: true, field: "language" };
  return { ok: false, field: null };
}

function fixtureImageCorroboration(assembled) {
  return (
    assembled.allowSyntheticImageEvidence &&
    assembled.syntheticImageCorroboration
  );
}

function hasIndependentCorroboration(assembled) {
  if (independentStructuredCorroboration(assembled).ok) return true;
  return fixtureImageCorroboration(assembled);
}

function brandAndCategoryAgree(assembled) {
  if (assembled.categoryConflict) return false;
  if (assembled.brandConflict) return false;
  const game = pairField(assembled.left, assembled.right, "game");
  if (game.left && game.right && !valuesEqual(game.left, game.right)) return false;
  const character = pairField(assembled.left, assembled.right, "character");
  if (
    character.left &&
    character.right &&
    !valuesEqual(character.left, character.right)
  ) {
    return false;
  }
  return true;
}

module.exports = {
  OWNER_BACKED_STRUCTURED,
  DERIVED_STRUCTURED,
  PRESENTATION_ONLY,
  MVP_PROFILES,
  matchingDecisionEligible,
  resolveSingleProfileV2,
  resolvePairProfileV2,
  isTradingCardCategoryHint,
  hasOwnerTradingCardGeometry,
  assemblePairEvidence,
  pairField,
  valuesEqual,
  bothPresentDiffer,
  isOwner,
  isDerived,
  ownerVsDerivedExact,
  bothOwnerExact,
  bothDerivedOnly,
  comparisonOf,
  evidenceRow,
  uniqueProvenanceFamilies,
  independentStructuredCorroboration,
  hasIndependentCorroboration,
  brandAndCategoryAgree,
  fixtureImageCorroboration,
  titleHasExactValue,
  isSneakerStyleAspect,
  pickField,
};
