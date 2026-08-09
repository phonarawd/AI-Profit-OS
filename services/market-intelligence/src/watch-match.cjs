/**
 * Engine §0.0 watch matching
 * Keys: brand + reference (+ model when asset declares it)
 * Fuzzy-alone auto-publish = FORBIDDEN.
 */

/**
 * @typedef {object} WatchIdentity
 * @property {string} [brand]
 * @property {string} [reference]
 * @property {string} [model]
 */

/**
 * @param {string | null | undefined} v
 */
function normPart(v) {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[./]/g, "-")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Canonical match key (model optional when present on asset).
 * @param {WatchIdentity} id
 * @returns {string}
 */
function buildWatchMatchKey(id) {
  const parts = [normPart(id.brand), normPart(id.reference)];
  if (id.model) parts.push(normPart(id.model));
  return parts.join("|");
}

/**
 * Exact identity = brand+reference (+ model when asset declares it).
 * Fuzzy = brand+reference core miss while brand alone matches — never enough alone.
 * @param {WatchIdentity} asset
 * @param {WatchIdentity} candidate
 * @returns {{ exact: boolean, fuzzy: boolean, missing: string[] }}
 */
function matchWatchIdentity(asset, candidate) {
  /** @type {string[]} */
  const missing = [];
  const ab = normPart(asset.brand);
  const ar = normPart(asset.reference);
  const cb = normPart(candidate.brand);
  const cr = normPart(candidate.reference);
  if (!ab) missing.push("asset.brand");
  if (!ar) missing.push("asset.reference");
  if (!cb) missing.push("candidate.brand");
  if (!cr) missing.push("candidate.reference");

  const coreOk = Boolean(ab && ar && cb && cr && ab === cb && ar === cr);
  if (!coreOk) {
    const brandOnly = Boolean(ab && cb && ab === cb && ar && cr && ar !== cr);
    return { exact: false, fuzzy: brandOnly, missing };
  }

  const am = normPart(asset.model);
  if (am) {
    const cm = normPart(candidate.model);
    if (!cm) missing.push("candidate.model");
    if (!cm || am !== cm) {
      return { exact: false, fuzzy: true, missing };
    }
  }

  return { exact: true, fuzzy: false, missing };
}

/**
 * Auto-publish guard for watch SKU match.
 * Fuzzy alone ⇒ false.
 * @param {{
 *   assetMeta: WatchIdentity,
 *   listingMeta?: WatchIdentity,
 *   listingTitle?: string,
 * }} input
 */
function evaluateWatchListingMatch(input) {
  const asset = input.assetMeta || {};
  const listing = input.listingMeta || {};
  const hasListingIdentity = Boolean(
    normPart(listing.brand) && normPart(listing.reference),
  );
  const identity = matchWatchIdentity(asset, {
    brand: listing.brand,
    reference: listing.reference,
    model: listing.model,
  });

  const exactOk = hasListingIdentity && identity.exact === true;
  const fuzzyAlone = identity.fuzzy === true && !exactOk;
  const canAutoPublish = exactOk && !fuzzyAlone;

  return {
    identity,
    fuzzyAloneForbidden: fuzzyAlone,
    canAutoPublish,
    matchKey: buildWatchMatchKey(asset),
  };
}

module.exports = {
  buildWatchMatchKey,
  matchWatchIdentity,
  evaluateWatchListingMatch,
};
