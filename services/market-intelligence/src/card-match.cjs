/**
 * Engine §0.0 trading_card matching
 * Keys: set + number + lang + finish (+ grade)
 * Fuzzy-alone auto-publish = FORBIDDEN.
 */

const { evaluateListingGradeMatch } = require("./card-grade.cjs");

/**
 * @typedef {object} CardIdentity
 * @property {string} [set]
 * @property {string} [number]
 * @property {string} [lang]  en|ja|ko|…
 * @property {string} [finish]  holofoil|reverse|normal|first_edition|…
 * @property {string} [gradeDeclared]
 * @property {'pokemon'|'yugioh'|string} [game]
 */

/**
 * @param {string | null | undefined} v
 */
function normPart(v) {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

/**
 * Canonical match key (grade optional segment).
 * @param {CardIdentity} id
 * @param {{ includeGrade?: boolean }} [opts]
 * @returns {string}
 */
function buildCardMatchKey(id, opts = {}) {
  const includeGrade = opts.includeGrade !== false;
  const parts = [
    normPart(id.game) || "card",
    normPart(id.set),
    normPart(id.number),
    normPart(id.lang) || "en",
    normPart(id.finish) || "normal",
  ];
  if (includeGrade && id.gradeDeclared) {
    parts.push(normPart(id.gradeDeclared));
  }
  return parts.join("|");
}

/**
 * Exact identity match on set+number+lang+finish.
 * @param {CardIdentity} asset
 * @param {CardIdentity} candidate
 * @returns {{ exact: boolean, fuzzy: boolean, missing: string[] }}
 */
function matchCardIdentity(asset, candidate) {
  /** @type {string[]} */
  const missing = [];
  const fields = ["set", "number", "lang", "finish"];
  let exact = true;
  for (const f of fields) {
    const a = normPart(asset[f]);
    const c = normPart(candidate[f]);
    if (!a) missing.push(`asset.${f}`);
    if (!c) missing.push(`candidate.${f}`);
    if (!a || !c || a !== c) exact = false;
  }
  // game family must agree when both present
  const ag = normPart(asset.game);
  const cg = normPart(candidate.game);
  if (ag && cg && ag !== cg) exact = false;

  // Fuzzy = name-ish overlap only (never sufficient alone)
  const fuzzy =
    !exact &&
    Boolean(normPart(asset.set)) &&
    normPart(asset.set) === normPart(candidate.set) &&
    Boolean(normPart(asset.number)) &&
    normPart(asset.number) === normPart(candidate.number);

  return { exact, fuzzy, missing };
}

/**
 * Auto-publish guard for trading_card SKU match.
 * Fuzzy alone ⇒ false. Grade mismatch ⇒ false.
 * @param {{
 *   assetMeta: CardIdentity & { gradeDeclared?: string },
 *   listingMeta?: CardIdentity,
 *   listingTitle?: string,
 *   listingCaption?: string,
 * }} input
 */
function evaluateCardListingMatch(input) {
  const asset = input.assetMeta || {};
  const listing = input.listingMeta || {};
  const hasListingIdentity = Boolean(
    normPart(listing.set) && normPart(listing.number),
  );
  const identity = matchCardIdentity(asset, {
    set: listing.set,
    number: listing.number,
    lang: listing.lang || asset.lang || "en",
    finish: listing.finish || asset.finish || "normal",
    game: listing.game || asset.game,
  });

  const grade = evaluateListingGradeMatch({
    gradeDeclared: asset.gradeDeclared,
    listingTitle: input.listingTitle,
    listingCaption: input.listingCaption,
  });

  const exactOk = hasListingIdentity && identity.exact === true;
  const fuzzyAlone = identity.fuzzy === true && !exactOk;
  const canAutoPublish =
    exactOk && !grade.gradeMismatch && !fuzzyAlone;

  return {
    identity,
    grade,
    gradeMismatch: grade.gradeMismatch,
    fuzzyAloneForbidden: fuzzyAlone,
    canAutoPublish,
    matchKey: buildCardMatchKey(asset),
  };
}

/**
 * Catalog hydrate sources for trading_card only.
 * @param {'pokemon'|'yugioh'|string} game
 * @returns {'pokemontcg'|'ygoprodeck'|null}
 */
function catalogSourceForGame(game) {
  const g = normPart(game);
  if (g === "pokemon") return "pokemontcg";
  if (g === "yugioh" || g === "yu-gi-oh") return "ygoprodeck";
  return null;
}

module.exports = {
  buildCardMatchKey,
  matchCardIdentity,
  evaluateCardListingMatch,
  catalogSourceForGame,
};
