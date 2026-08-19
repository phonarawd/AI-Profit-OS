/**
 * Identity evidence extraction.
 * Normalize는 비교 보조만. ownerless inference로 identifier type을 만들지 않는다.
 * raw meta.modelNumber equality alone != strong identity match.
 */

function asString(value) {
  if (value == null) return "";
  return String(value).trim();
}

function normalizeText(value) {
  return asString(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

function normalizeIdentifierValue(value) {
  return asString(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

function validGtin(raw) {
  const text = asString(raw);
  if (!text) return "";
  if (!/^\d{8}$|^\d{12,14}$/.test(text)) return "";
  return text;
}

function metaOf(obs) {
  return obs && obs.meta && typeof obs.meta === "object" ? obs.meta : {};
}

function hintsOf(obs) {
  const meta = metaOf(obs);
  return meta.identityHints && typeof meta.identityHints === "object" ? meta.identityHints : {};
}

function brandProvenance(source) {
  if (source === "ebay") return "ebay.item.brand";
  if (source === "fashionphile") return "fashionphile.product.vendor";
  if (source === "chrono24") return "chrono24.brand";
  return `${source || "unknown"}.meta.brand`;
}

/**
 * source-specific semantic extraction. field 이름이 같아도 type을 공유하지 않는다.
 * eBay modelNumber ≈ MPN. Chrono24 modelNumber ≈ reference. Fashionphile sku ≠ MPN.
 */
function extractTypedIdentifiers(obs) {
  const source = asString(obs && obs.source);
  const meta = metaOf(obs);
  const hints = hintsOf(obs);
  const brand = normalizeText(meta.brand);
  /** @type {Array<{ type: string, value: string, brand: string, provenance: string }>} */
  const out = [];

  const gtin = validGtin(hints.gtin);
  if (gtin) {
    out.push({
      type: "GTIN",
      value: gtin,
      brand,
      provenance: source === "ebay" ? "ebay.item.gtin" : `${source}.identityHints.gtin`,
    });
  }

  if (source === "ebay") {
    const mpn = normalizeIdentifierValue(meta.modelNumber);
    if (mpn) {
      out.push({
        type: "MPN",
        value: mpn,
        brand,
        provenance: "ebay.item.mpn",
      });
    }
  }

  if (source === "chrono24") {
    const reference = normalizeIdentifierValue(meta.modelNumber);
    if (reference) {
      out.push({
        type: "WATCH_REFERENCE",
        value: reference,
        brand,
        provenance: "chrono24.reference",
      });
    }
  }

  return out;
}

function extractSourceLocal(obs) {
  const source = asString(obs && obs.source);
  const meta = metaOf(obs);
  const hints = hintsOf(obs);
  return {
    externalItemId: asString(obs && obs.externalItemId) || null,
    sku: source === "fashionphile" && meta.sku ? asString(meta.sku) : null,
    epid: source === "ebay" && hints.epid ? asString(hints.epid) : null,
    inferredEpid: source === "ebay" && hints.inferredEpid ? asString(hints.inferredEpid) : null,
  };
}

/**
 * owner-backed category/type만. title/source 이름 추론 금지.
 */
function resolveSingleProfile(obs) {
  const hint = normalizeText(metaOf(obs).categoryHint);
  if (!hint) return "unknown";
  if (
    /\bwristwatch/.test(hint) ||
    /\bwrist watches\b/.test(hint) ||
    /\bwatches\b/.test(hint)
  ) {
    return "watch";
  }
  if (/\bbags?\b/.test(hint) && /\bhandbags?\b/.test(hint)) return "luxury_bag";
  if (/\bluxury bag/.test(hint)) return "luxury_bag";
  return "unknown";
}

function resolvePairProfile(leftObs, rightObs, leftIds, rightIds) {
  const left = resolveSingleProfile(leftObs);
  const right = resolveSingleProfile(rightObs);
  if (left !== "unknown" && left === right) return left;

  const leftWatch = (leftIds || []).some((id) => id.type === "WATCH_REFERENCE");
  const rightWatch = (rightIds || []).some((id) => id.type === "WATCH_REFERENCE");
  if (leftWatch && rightWatch) return "watch";

  return "unknown";
}

function matchingDecisionEligible(leftObs, rightObs) {
  return (
    leftObs &&
    rightObs &&
    leftObs.observationPurpose === "CONFIRMATION" &&
    rightObs.observationPurpose === "CONFIRMATION" &&
    leftObs.sourceStatus === "SUCCESS" &&
    rightObs.sourceStatus === "SUCCESS"
  );
}

function extractNormalized(obs) {
  const meta = metaOf(obs);
  const hints = hintsOf(obs);
  const identifiers = extractTypedIdentifiers(obs);
  return {
    id: asString(obs && obs.id) || null,
    source: asString(obs && obs.source) || null,
    observationPurpose: asString(obs && obs.observationPurpose) || null,
    sourceStatus: asString(obs && obs.sourceStatus) || null,
    title: asString(obs && obs.title) || null,
    titleNorm: normalizeText(obs && obs.title),
    imageUrl: asString(obs && obs.imageUrl) || null,
    brand: normalizeText(meta.brand),
    brandRaw: asString(meta.brand) || null,
    brandProvenance: brandProvenance(asString(obs && obs.source)),
    model: normalizeText(meta.model),
    modelRaw: asString(meta.model) || null,
    size: normalizeText(meta.size),
    sizeRaw: asString(meta.size) || null,
    color: normalizeText(hints.color),
    colorRaw: asString(hints.color) || null,
    condition: normalizeText(meta.condition),
    categoryHint: asString(meta.categoryHint) || null,
    identifiers,
    sourceLocal: extractSourceLocal(obs),
    singleProfile: resolveSingleProfile(obs),
  };
}

module.exports = {
  asString,
  normalizeText,
  normalizeIdentifierValue,
  validGtin,
  extractTypedIdentifiers,
  extractSourceLocal,
  resolveSingleProfile,
  resolvePairProfile,
  matchingDecisionEligible,
  extractNormalized,
};
