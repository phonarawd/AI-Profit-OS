/**
 * generateCandidatePairs — 관측 풀에서 교차 소스 후보 쌍만 낸다.
 * matcher를 호출하지 않는다. 후보를 MATCH/Opportunity로 승격하지 않는다.
 */

const {
  GENERATOR_VERSION,
  CANDIDATE_IS_NOT_MATCH_TRUTH,
  CANDIDATE_IS_NOT_OPPORTUNITY,
  REASONS,
} = require("./contract.cjs");
const {
  extractBlockingRecords,
  titleHitsAnchors,
  canOwnerAnchor,
  profilesCompatible,
  pairProfile,
} = require("./keys.cjs");

const CATEGORY_NATIVE_FAMILIES = new Set([
  "TRADING_CARD_SET_NUMBER",
  "SNEAKER_STYLE",
  "WATCH_BRAND_REFERENCE",
  "LUXURY_BAG_IDENTITY",
]);

function orderedPair(a, b) {
  if (a.id < b.id) return [a, b];
  if (a.id > b.id) return [b, a];
  return a.source < b.source ? [a, b] : [b, a];
}

function collectSharedKeys(left, right) {
  const shared = [];
  const seen = new Set();

  function add(entry) {
    const token = `${entry.family}|${entry.key}|${entry.reason}`;
    if (seen.has(token)) return;
    seen.add(token);
    shared.push(entry);
  }

  const rightByKey = new Map();
  for (const rec of right.records) {
    rightByKey.set(`${rec.family}|${rec.key}`, rec);
  }
  for (const rec of left.records) {
    const hit = rightByKey.get(`${rec.family}|${rec.key}`);
    if (!hit) continue;
    add({
      family: rec.family,
      key: rec.key,
      reason: rec.reason,
    });
  }

  for (const rec of left.records) {
    if (!rec.ownerAnchored || !rec.anchors) continue;
    if (canOwnerAnchor(left, right) && titleHitsAnchors(right.title, rec.anchors)) {
      add({
        family: rec.family,
        key: rec.key,
        reason: REASONS.OWNER_ANCHORED_TITLE,
      });
    }
  }
  for (const rec of right.records) {
    if (!rec.ownerAnchored || !rec.anchors) continue;
    if (canOwnerAnchor(right, left) && titleHitsAnchors(left.title, rec.anchors)) {
      add({
        family: rec.family,
        key: rec.key,
        reason: REASONS.OWNER_ANCHORED_TITLE,
      });
    }
  }

  return shared.sort((a, b) => {
    const fa = `${a.family}|${a.key}|${a.reason}`;
    const fb = `${b.family}|${b.key}|${b.reason}`;
    return fa < fb ? -1 : fa > fb ? 1 : 0;
  });
}

function allowNativeFamily(left, right, family) {
  if (!CATEGORY_NATIVE_FAMILIES.has(family) && family !== "WATCH_BRAND_REFERENCE") {
    return true;
  }
  if (left.deferred || right.deferred || left.unsupported || right.unsupported) {
    return family === "TYPED_GTIN" || family === "TYPED_MPN";
  }
  return true;
}

function brandConflict(left, right) {
  return Boolean(
    left.brandNormalized &&
      right.brandNormalized &&
      left.brandNormalized !== right.brandNormalized,
  );
}

/**
 * @param {object[]} observations
 * @param {{ now?: string }} [opts]
 */
function generateCandidatePairs(observations, opts) {
  const generatedAt =
    opts && opts.now ? String(opts.now) : new Date().toISOString();
  const list = Array.isArray(observations) ? observations : [];
  const extracted = list
    .map((obs) => extractBlockingRecords(obs))
    .filter((row) => row.id && row.source);

  const candidates = [];

  for (let i = 0; i < extracted.length; i += 1) {
    for (let j = i + 1; j < extracted.length; j += 1) {
      const rawLeft = extracted[i];
      const rawRight = extracted[j];
      if (rawLeft.id === rawRight.id) continue;
      if (rawLeft.source === rawRight.source) continue;
      if (!rawLeft.eligible || !rawRight.eligible) continue;
      if (!profilesCompatible(rawLeft, rawRight)) continue;
      if (brandConflict(rawLeft, rawRight)) continue;

      const [left, right] = orderedPair(rawLeft, rawRight);
      const blockingKeys = collectSharedKeys(left, right).filter((row) =>
        allowNativeFamily(left, right, row.family),
      );
      if (blockingKeys.length === 0) continue;

      candidates.push({
        leftObservationId: left.id,
        rightObservationId: right.id,
        leftSource: left.source,
        rightSource: right.source,
        categoryProfile: pairProfile(left, right),
        blockingKeys,
        reason: blockingKeys[0] ? blockingKeys[0].reason : null,
        isMatchTruth: false,
        matchingDecision: null,
        matchPath: null,
        listingPromotion: false,
        opportunity: false,
        candidateIsNotMatchTruth: CANDIDATE_IS_NOT_MATCH_TRUTH,
        candidateIsNotOpportunity: CANDIDATE_IS_NOT_OPPORTUNITY,
        generatorVersion: GENERATOR_VERSION,
        generatedAt,
      });
    }
  }

  candidates.sort((a, b) => {
    const fa = `${a.leftObservationId}|${a.rightObservationId}`;
    const fb = `${b.leftObservationId}|${b.rightObservationId}`;
    return fa < fb ? -1 : fa > fb ? 1 : 0;
  });

  return {
    candidates,
    generatorVersion: GENERATOR_VERSION,
    generatedAt,
    counts: {
      observations: extracted.length,
      emitted: candidates.length,
    },
  };
}

module.exports = { generateCandidatePairs };
