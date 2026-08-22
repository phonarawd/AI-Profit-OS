/**
 * In-memory CanonicalProduct + source link.
 * PRODUCTION / durable DB persistence = NOT_IMPLEMENTED
 */

const { FORBIDDEN_ON_LINK } = require("./contract.cjs");
const { optionalEnrichmentFieldsFor } = require("./generic-profile.cjs");
const {
  allocateCanonicalProductId,
  createProductCodeAllocator,
} = require("./product-code.cjs");

function stripForbiddenLinkFields(link) {
  const stored = { ...link };
  for (const field of FORBIDDEN_ON_LINK) {
    delete stored[field];
  }
  return stored;
}

function createMemoryCanonicalProductRepository() {
  /** @type {Map<string, object>} */
  const products = new Map();
  /** @type {Map<string, object[]>} */
  const linksByProduct = new Map();
  /** @type {Map<string, string>} */
  const byIdentityKey = new Map();
  /** @type {Map<string, string>} */
  const identityKeyByProduct = new Map();
  /** @type {Map<string, string>} */
  const byObservationRef = new Map();
  const allocator = createProductCodeAllocator(1);

  function getProduct(canonicalProductId) {
    const product = products.get(canonicalProductId);
    return product ? { ...product, canonicalAttributes: { ...product.canonicalAttributes } } : null;
  }

  function getByIdentityKey(identityKey) {
    const id = byIdentityKey.get(identityKey);
    return id ? getProduct(id) : null;
  }

  function getProductIdByObservationRef(observationId) {
    return byObservationRef.get(observationId) || null;
  }

  function getIdentityKey(canonicalProductId) {
    return identityKeyByProduct.get(canonicalProductId) || null;
  }

  function listLinks(canonicalProductId) {
    const rows = linksByProduct.get(canonicalProductId) || [];
    return rows.map((row) => ({ ...row, evidence: { ...row.evidence } }));
  }

  function listProducts() {
    return [...products.keys()].map((id) => getProduct(id));
  }

  function createProduct({
    categoryProfile,
    canonicalAttributes,
    identityKey,
    identityEvidenceSummary,
    now,
  }) {
    if (!identityKey) {
      throw new Error("identityKey required");
    }
    const existing = getByIdentityKey(identityKey);
    if (existing) return existing;

    const at = now || new Date().toISOString();
    const canonicalProductId = allocateCanonicalProductId();
    const product = {
      canonicalProductId,
      putdukProductCode: allocator.nextCode(),
      categoryProfile,
      canonicalAttributes: { ...(canonicalAttributes || {}) },
      variants: [],
      identityEvidenceSummary: { ...(identityEvidenceSummary || {}) },
      createdAt: at,
      updatedAt: at,
    };
    products.set(canonicalProductId, product);
    linksByProduct.set(canonicalProductId, []);
    byIdentityKey.set(identityKey, canonicalProductId);
    identityKeyByProduct.set(canonicalProductId, identityKey);
    return getProduct(canonicalProductId);
  }

  function enrichAttributes(canonicalProductId, incoming, now) {
    const product = products.get(canonicalProductId);
    if (!product) return null;
    const next = { ...product.canonicalAttributes };
    for (const field of optionalEnrichmentFieldsFor(product.categoryProfile)) {
      if (next[field] == null && incoming && incoming[field]) {
        next[field] = incoming[field];
      }
    }
    product.canonicalAttributes = next;
    product.updatedAt = now || new Date().toISOString();
    return getProduct(canonicalProductId);
  }

  function attachLink(canonicalProductId, link, observationId) {
    const product = products.get(canonicalProductId);
    if (!product) {
      return { ok: false, reason: "PRODUCT_NOT_FOUND", link: null };
    }
    const owner = byObservationRef.get(observationId);
    if (owner && owner !== canonicalProductId) {
      return {
        ok: false,
        reason: "OBSERVATION_CANONICAL_PRODUCT_CONFLICT",
        link: null,
      };
    }

    const stored = stripForbiddenLinkFields({
      ...link,
      canonicalProductId,
    });
    const links = linksByProduct.get(canonicalProductId);
    const same = links.find(
      (row) =>
        row.source === stored.source && row.sourceItemId === stored.sourceItemId,
    );
    if (same) {
      same.latestObservationRef = stored.latestObservationRef;
      same.matchingDecision = stored.matchingDecision;
      same.matcherVersion = stored.matcherVersion;
      same.evidence = stored.evidence;
      if (observationId) byObservationRef.set(observationId, canonicalProductId);
      return { ok: true, idempotent: true, link: { ...same } };
    }

    links.push(stored);
    if (observationId) byObservationRef.set(observationId, canonicalProductId);
    return { ok: true, idempotent: false, link: { ...stored } };
  }

  return {
    createProduct,
    enrichAttributes,
    attachLink,
    getProduct,
    getByIdentityKey,
    getProductIdByObservationRef,
    getIdentityKey,
    listLinks,
    listProducts,
  };
}

module.exports = {
  createMemoryCanonicalProductRepository,
};
