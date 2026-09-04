/**
 * Engine §51.12 — Card Grade · PSA Pipeline
 * PSA is NOT a price adapter. Extract grade from listing title/caption,
 * compare to asset.gradeDeclared → mismatch ⇒ compareReady=false.
 */

/** @typedef {'PSA'|'BGS'|'CGC'|'SGC'|'raw'|null} GradeCompany */

/**
 * @typedef {object} ExtractedGrade
 * @property {GradeCompany} company
 * @property {string | null} grade  numeric string e.g. "10" | "9.5"
 * @property {boolean} raw
 * @property {string} normalized  e.g. "PSA10" | "BGS9.5" | "raw" | "unknown"
 * @property {boolean} found
 */

const COMPANY_ALIASES = Object.freeze({
  psa: "PSA",
  bgs: "BGS",
  beckett: "BGS",
  cgc: "CGC",
  sgc: "SGC",
});

/**
 * Normalize declared/extracted grade tokens for comparison.
 * @param {string | null | undefined} value
 * @returns {string}
 */
function normalizeGradeToken(value) {
  if (value == null) return "";
  const s = String(value).trim().toUpperCase().replace(/\s+/g, "");
  if (!s) return "";
  if (s === "RAW" || s === "UNGRADED" || s === "UNSLABBED") return "RAW";
  // PSA 10 / PSA10 / GEM MINT PSA 10
  const m = s.match(/^(PSA|BGS|CGC|SGC)[-_]?(\d+(?:\.\d+)?)$/);
  if (m) return `${m[1]}${m[2]}`;
  if (/^\d+(?:\.\d+)?$/.test(s)) return `GRADE${s}`;
  return s;
}

/**
 * Extract grade from listing title/caption.
 * Patterns: PSA10, PSA 10, BGS 9.5, CGC10, "raw", "ungraded".
 * @param {string | null | undefined} text
 * @returns {ExtractedGrade}
 */
function extractGradeFromText(text) {
  const rawText = String(text ?? "");
  if (!rawText.trim()) {
    return {
      company: null,
      grade: null,
      raw: false,
      normalized: "unknown",
      found: false,
    };
  }

  if (/\b(raw|ungraded|unslabbed|no\s*grade)\b/i.test(rawText)) {
    return {
      company: "raw",
      grade: null,
      raw: true,
      normalized: "raw",
      found: true,
    };
  }

  // PSA/BGS/CGC/SGC + optional space/dash + grade
  const re =
    /\b(PSA|BGS|Beckett|CGC|SGC)\s*(?:[-:]\s*)?(\d{1,2}(?:\.\d)?)\b/i;
  const m = rawText.match(re);
  if (m) {
    const companyKey = m[1].toLowerCase();
    const company = COMPANY_ALIASES[companyKey] || m[1].toUpperCase();
    const grade = m[2];
    return {
      company,
      grade,
      raw: false,
      normalized: `${company}${grade}`,
      found: true,
    };
  }

  // Bare "GEM MINT 10" near PSA mention
  if (/\bPSA\b/i.test(rawText) && /\b(?:gem\s*mint\s*)?10\b/i.test(rawText)) {
    return {
      company: "PSA",
      grade: "10",
      raw: false,
      normalized: "PSA10",
      found: true,
    };
  }

  return {
    company: null,
    grade: null,
    raw: false,
    normalized: "unknown",
    found: false,
  };
}

/**
 * @param {string | null | undefined} gradeDeclared  Asset Master meta.gradeDeclared
 * @param {ExtractedGrade} observed
 * @returns {{ match: boolean, gradeMismatch: boolean, reason: string }}
 */
function compareGradeDeclared(gradeDeclared, observed) {
  const declaredNorm = normalizeGradeToken(gradeDeclared);
  if (!declaredNorm) {
    // No declared grade → cannot mismatch (watch/bag or raw catalog)
    return { match: true, gradeMismatch: false, reason: "no_declared" };
  }
  if (!observed?.found) {
    // Declared graded SKU but listing has no extractable grade → mismatch (unsafe auto-publish)
    return {
      match: false,
      gradeMismatch: true,
      reason: "listing_grade_missing",
    };
  }
  const obsNorm = normalizeGradeToken(observed.normalized);
  if (declaredNorm === obsNorm) {
    return { match: true, gradeMismatch: false, reason: "exact" };
  }
  // raw vs graded always mismatch
  if (declaredNorm === "RAW" || obsNorm === "RAW") {
    return { match: false, gradeMismatch: true, reason: "raw_vs_graded" };
  }
  return { match: false, gradeMismatch: true, reason: "grade_diff" };
}

/**
 * §51.12 pipeline entry.
 * @param {{
 *   gradeDeclared?: string | null,
 *   listingTitle?: string | null,
 *   listingCaption?: string | null,
 * }} input
 */
function evaluateListingGradeMatch(input) {
  const text = [input.listingTitle, input.listingCaption]
    .filter(Boolean)
    .join(" · ");
  const observed = extractGradeFromText(text);
  const cmp = compareGradeDeclared(input.gradeDeclared, observed);
  return {
    gradeDeclared: input.gradeDeclared
      ? normalizeGradeToken(input.gradeDeclared)
      : null,
    observed,
    gradeMismatch: cmp.gradeMismatch,
    match: cmp.match,
    reason: cmp.reason,
  };
}

module.exports = {
  normalizeGradeToken,
  extractGradeFromText,
  compareGradeDeclared,
  evaluateListingGradeMatch,
};
