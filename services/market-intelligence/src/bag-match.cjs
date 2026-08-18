/**
 * Engine §0.0 luxury_bag matching
 * Keys: brand + model (+ size/color)
 * Fuzzy-alone auto-publish = FORBIDDEN.
 */

/**
 * @typedef {object} BagIdentity
 * @property {string} [brand]
 * @property {string} [model]
 * @property {string} [size]
 * @property {string} [color]
 */

/**
 * @param {string | null | undefined} v
 */
function normPart(v) {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Canonical match key (size/color optional segments when present).
 * @param {BagIdentity} id
 * @returns {string}
 */
function buildBagMatchKey(id) {
  const parts = [normPart(id.brand), normPart(id.model)];
  if (id.size) parts.push(normPart(id.size));
  if (id.color) parts.push(normPart(id.color));
  return parts.join("|");
}

/**
 * Exact identity = brand+model (+ size/color when asset declares them).
 * Fuzzy = brand+model only while size/color diverge — never enough alone.
 * @param {BagIdentity} asset
 * @param {BagIdentity} candidate
 * @returns {{ exact: boolean, fuzzy: boolean, missing: string[] }}
 */
function matchBagIdentity(asset, candidate) {
  /** @type {string[]} */
  const missing = [];
  const ab = normPart(asset.brand);
  const am = normPart(asset.model);
  const cb = normPart(candidate.brand);
  const cm = normPart(candidate.model);
  if (!ab) missing.push("asset.brand");
  if (!am) missing.push("asset.model");
  if (!cb) missing.push("candidate.brand");
  if (!cm) missing.push("candidate.model");

  const coreOk = Boolean(ab && am && cb && cm && ab === cb && am === cm);
  if (!coreOk) {
    return { exact: false, fuzzy: false, missing };
  }

  /** @type {string[]} */
  const optional = [];
  for (const f of ["size", "color"]) {
    const a = normPart(asset[f]);
    if (!a) continue;
    optional.push(f);
    const c = normPart(candidate[f]);
    if (!c) missing.push(`candidate.${f}`);
    if (!c || a !== c) {
      return { exact: false, fuzzy: true, missing };
    }
  }

  return { exact: true, fuzzy: false, missing };
}

/**
 * Auto-publish guard for luxury_bag SKU match.
 * Fuzzy alone ⇒ false.
 * @param {{
 *   assetMeta: BagIdentity,
 *   listingMeta?: BagIdentity,
 *   listingTitle?: string,
 * }} input
 */
function evaluateBagListingMatch(input) {
  const asset = input.assetMeta || {};
  const listing = input.listingMeta || {};
  const hasListingIdentity = Boolean(
    normPart(listing.brand) && normPart(listing.model),
  );
  const identity = matchBagIdentity(asset, {
    brand: listing.brand,
    model: listing.model,
    size: listing.size,
    color: listing.color,
  });

  const exactOk = hasListingIdentity && identity.exact === true;
  const fuzzyAlone = identity.fuzzy === true && !exactOk;
  const canAutoPublish = exactOk && !fuzzyAlone;

  return {
    identity,
    fuzzyAloneForbidden: fuzzyAlone,
    canAutoPublish,
    matchKey: buildBagMatchKey(asset),
  };
}

module.exports = {
  buildBagMatchKey,
  matchBagIdentity,
  evaluateBagListingMatch,
};
