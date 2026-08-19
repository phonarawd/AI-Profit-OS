/**
 * CanonicalProduct durable repository — querier DI only.
 * URL / production 판정은 하지 않는다. memory fallback 금지.
 * BEGIN/COMMIT은 호출자가 넘긴 동일 pinned Client에서만 수행한다.
 */

const { CREATE_BLOCKED } = require("./contract.cjs");
const { optionalEnrichmentFieldsFor } = require("./generic-profile.cjs");
const { allocateCanonicalProductId, formatPutdukProductCode } = require("./product-code.cjs");
const {
  toPersistenceRecord,
  fromPersistenceRecord,
  pickDomainProduct,
  toLinkRecord,
  fromLinkRecord,
} = require("./persistence-mapper.cjs");

const INSERT_PRODUCT_SQL = `
INSERT INTO public.canonical_products (
  canonical_product_id,
  putduk_product_code,
  category_profile,
  canonical_identity_key,
  canonical_attributes,
  identity_evidence_summary,
  payload,
  created_at,
  updated_at
) VALUES (
  $1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9
)
ON CONFLICT (category_profile, canonical_identity_key) DO NOTHING
RETURNING *
`.trim();

const SELECT_BY_ID_SQL = `
SELECT * FROM public.canonical_products WHERE canonical_product_id = $1
`.trim();

const SELECT_BY_IDENTITY_SQL = `
SELECT * FROM public.canonical_products
WHERE category_profile = $1 AND canonical_identity_key = $2
`.trim();

const SELECT_LINKS_SQL = `
SELECT * FROM public.canonical_product_source_links
WHERE canonical_product_id = $1
ORDER BY created_at ASC, id ASC
`.trim();

const SELECT_LINK_BY_OBS_SQL = `
SELECT canonical_product_id, source, source_item_id, latest_observation_ref
FROM public.canonical_product_source_links
WHERE latest_observation_ref = $1
`.trim();

const SELECT_LINK_BY_SOURCE_ITEM_SQL = `
SELECT *
FROM public.canonical_product_source_links
WHERE canonical_product_id = $1 AND source = $2 AND source_item_id = $3
`.trim();

const INSERT_LINK_SQL = `
INSERT INTO public.canonical_product_source_links (
  canonical_product_id,
  source,
  source_item_id,
  source_url,
  latest_observation_ref,
  matching_decision,
  matcher_version,
  evidence
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
ON CONFLICT (canonical_product_id, source, source_item_id) DO NOTHING
RETURNING *
`.trim();

const UPDATE_ENRICH_SQL = `
UPDATE public.canonical_products
SET canonical_attributes = $2::jsonb,
    payload = $3::jsonb,
    updated_at = $4
WHERE canonical_product_id = $1
RETURNING *
`.trim();

const LIST_PRODUCTS_SQL = `
SELECT * FROM public.canonical_products ORDER BY created_at ASC
`.trim();

function persistenceStatus() {
  return {
    CANONICAL_PRODUCT_RUNTIME: "DURABLE_DB_RUNTIME_VERIFIED",
    CANONICAL_PRODUCT_DURABLE_DB_PERSISTENCE: "PASS",
    CANONICAL_PRODUCT_SOURCE_LINK_DB_RUNTIME: "PASS",
    PUTDUK_PRODUCT_ID_STABLE: "PASS",
    PUTDUK_PRODUCT_ID_STABLE_WITHIN_REPOSITORY_LIFETIME: "PASS",
    PUTDUK_PRODUCT_ID_DURABLE_STABILITY: "PASS",
    MATCH_RESULT_DURABLE_PERSISTENCE: "NOT_IMPLEMENTED",
    GENERIC_PRODUCT_PROFILE: "PASS",
    CANDIDATE_GENERATION: "NOT_IMPLEMENTED",
    PRODUCTION_CANONICAL_PRODUCT_PERSISTENCE: "NOT_IMPLEMENTED",
    PRODUCTION_CANONICAL_PRODUCT_PG_CLIENT_WIRING: "NOT_IMPLEMENTED",
  };
}

function mapProductRow(row) {
  const mapped = fromPersistenceRecord(row);
  if (!mapped.ok) return mapped;
  return { ok: true, product: mapped.product, identityKey: mapped.identityKey, record: row };
}

function createDurableCanonicalProductRepository(input) {
  const querier = input && input.querier;
  if (!querier || typeof querier.query !== "function") {
    throw new Error("DURABLE_REPOSITORY_REQUIRES_QUERIER");
  }

  let inTransaction = false;

  async function query(text, params) {
    return querier.query(text, params);
  }

  async function getProduct(canonicalProductId) {
    const result = await query(SELECT_BY_ID_SQL, [canonicalProductId]);
    const row = result && result.rows && result.rows[0];
    if (!row) return null;
    const mapped = mapProductRow(row);
    if (!mapped.ok) {
      const err = new Error(mapped.reason);
      err.failures = mapped.failures;
      throw err;
    }
    return mapped.product;
  }

  async function getByIdentityKey(identityKey, categoryProfile) {
    if (!identityKey) return null;
    let result;
    if (categoryProfile) {
      result = await query(SELECT_BY_IDENTITY_SQL, [categoryProfile, identityKey]);
    } else {
      result = await query(
        "SELECT * FROM public.canonical_products WHERE canonical_identity_key = $1",
        [identityKey],
      );
    }
    const row = result && result.rows && result.rows[0];
    if (!row) return null;
    const mapped = mapProductRow(row);
    if (!mapped.ok) {
      const err = new Error(mapped.reason);
      err.failures = mapped.failures;
      throw err;
    }
    return mapped.product;
  }

  async function getIdentityKey(canonicalProductId) {
    const result = await query(SELECT_BY_ID_SQL, [canonicalProductId]);
    const row = result && result.rows && result.rows[0];
    return row ? String(row.canonical_identity_key) : null;
  }

  async function getProductIdByObservationRef(observationId) {
    const result = await query(SELECT_LINK_BY_OBS_SQL, [observationId]);
    const row = result && result.rows && result.rows[0];
    return row ? String(row.canonical_product_id) : null;
  }

  async function listLinks(canonicalProductId) {
    const result = await query(SELECT_LINKS_SQL, [canonicalProductId]);
    const links = [];
    for (const row of (result && result.rows) || []) {
      const mapped = fromLinkRecord(row);
      if (!mapped.ok) {
        const err = new Error(mapped.reason);
        err.failures = mapped.failures;
        throw err;
      }
      links.push(mapped.link);
    }
    return links;
  }

  async function listProducts() {
    const result = await query(LIST_PRODUCTS_SQL, []);
    const products = [];
    for (const row of (result && result.rows) || []) {
      const mapped = mapProductRow(row);
      if (!mapped.ok) {
        const err = new Error(mapped.reason);
        err.failures = mapped.failures;
        throw err;
      }
      products.push(mapped.product);
    }
    return products;
  }

  async function createProduct({
    categoryProfile,
    canonicalAttributes,
    identityKey,
    identityEvidenceSummary,
    now,
  }) {
    if (!identityKey) throw new Error("identityKey required");
    const existing = await getByIdentityKey(identityKey, categoryProfile);
    if (existing) return existing;

    const at = now || new Date().toISOString();
    const seq = await query("SELECT nextval('public.putduk_product_code_seq') AS n");
    const sequence = seq && seq.rows && seq.rows[0] ? Number(seq.rows[0].n) : 0;
    const draft = {
      canonicalProductId: allocateCanonicalProductId(),
      putdukProductCode: formatPutdukProductCode(sequence),
      categoryProfile,
      canonicalAttributes: { ...(canonicalAttributes || {}) },
      variants: [],
      identityEvidenceSummary: { ...(identityEvidenceSummary || {}) },
      createdAt: at,
      updatedAt: at,
    };
    const mapped = toPersistenceRecord(draft, identityKey);
    if (!mapped.ok) {
      const err = new Error(mapped.reason);
      err.failures = mapped.failures;
      throw err;
    }
    const record = mapped.record;
    const inserted = await query(INSERT_PRODUCT_SQL, [
      record.canonical_product_id,
      record.putduk_product_code,
      record.category_profile,
      record.canonical_identity_key,
      JSON.stringify(record.canonical_attributes),
      JSON.stringify(record.identity_evidence_summary),
      JSON.stringify(record.payload),
      record.created_at,
      record.updated_at,
    ]);

    const insertedRow = inserted && inserted.rows && inserted.rows[0];
    if (insertedRow) {
      const readBack = mapProductRow(insertedRow);
      if (!readBack.ok) {
        const err = new Error(readBack.reason);
        err.failures = readBack.failures;
        throw err;
      }
      return readBack.product;
    }

    const raced = await getByIdentityKey(identityKey, categoryProfile);
    if (!raced) throw new Error("CONFLICT_RACE_MISSING_ROW");
    return raced;
  }

  async function enrichAttributes(canonicalProductId, incoming, now) {
    const product = await getProduct(canonicalProductId);
    if (!product) return null;
    const next = { ...product.canonicalAttributes };
    for (const field of optionalEnrichmentFieldsFor(product.categoryProfile)) {
      if (next[field] == null && incoming && incoming[field]) {
        next[field] = incoming[field];
      }
    }
    const at = now || new Date().toISOString();
    const updated = pickDomainProduct({
      ...product,
      canonicalAttributes: next,
      updatedAt: at,
    });
    const identityKey = await getIdentityKey(canonicalProductId);
    const mapped = toPersistenceRecord(updated, identityKey);
    if (!mapped.ok) {
      const err = new Error(mapped.reason);
      err.failures = mapped.failures;
      throw err;
    }
    const result = await query(UPDATE_ENRICH_SQL, [
      canonicalProductId,
      JSON.stringify(mapped.record.canonical_attributes),
      JSON.stringify(mapped.record.payload),
      at,
    ]);
    const row = result && result.rows && result.rows[0];
    if (!row) return null;
    const readBack = mapProductRow(row);
    if (!readBack.ok) {
      const err = new Error(readBack.reason);
      err.failures = readBack.failures;
      throw err;
    }
    return readBack.product;
  }

  async function attachLink(canonicalProductId, link, observationId) {
    const product = await getProduct(canonicalProductId);
    if (!product) {
      return { ok: false, reason: "PRODUCT_NOT_FOUND", link: null };
    }

    const obsId = observationId || (link && link.latestObservationRef);
    if (obsId) {
      const owner = await getProductIdByObservationRef(obsId);
      if (owner && owner !== canonicalProductId) {
        return {
          ok: false,
          reason: CREATE_BLOCKED.OBSERVATION_CONFLICT,
          link: null,
        };
      }
    }

    const stored = toLinkRecord(canonicalProductId, link);
    const existingBySource = await query(SELECT_LINK_BY_SOURCE_ITEM_SQL, [
      canonicalProductId,
      stored.source,
      stored.source_item_id,
    ]);
    const same = existingBySource && existingBySource.rows && existingBySource.rows[0];
    if (same) {
      if (String(same.latest_observation_ref) !== String(stored.latest_observation_ref)) {
        return { ok: false, reason: CREATE_BLOCKED.LINK_PAYLOAD_CONFLICT, link: null };
      }
      const mapped = fromLinkRecord(same);
      if (!mapped.ok) return { ok: false, reason: mapped.reason, link: null };
      return { ok: true, idempotent: true, link: mapped.link };
    }

    let inserted;
    try {
      inserted = await query(INSERT_LINK_SQL, [
        stored.canonical_product_id,
        stored.source,
        stored.source_item_id,
        stored.source_url,
        stored.latest_observation_ref,
        stored.matching_decision,
        stored.matcher_version,
        JSON.stringify(stored.evidence),
      ]);
    } catch (err) {
      const code = err && err.code;
      if (code === "23505") {
        const owner = await getProductIdByObservationRef(stored.latest_observation_ref);
        if (owner && owner !== canonicalProductId) {
          return {
            ok: false,
            reason: CREATE_BLOCKED.OBSERVATION_CONFLICT,
            link: null,
          };
        }
        return { ok: false, reason: CREATE_BLOCKED.LINK_PAYLOAD_CONFLICT, link: null };
      }
      throw err;
    }

    const insertedRow = inserted && inserted.rows && inserted.rows[0];
    if (insertedRow) {
      const mapped = fromLinkRecord(insertedRow);
      if (!mapped.ok) return { ok: false, reason: mapped.reason, link: null };
      return { ok: true, idempotent: false, link: mapped.link };
    }

    const raced = await query(SELECT_LINK_BY_SOURCE_ITEM_SQL, [
      canonicalProductId,
      stored.source,
      stored.source_item_id,
    ]);
    const racedRow = raced && raced.rows && raced.rows[0];
    if (!racedRow) {
      return { ok: false, reason: "CONFLICT_RACE_MISSING_ROW", link: null };
    }
    if (String(racedRow.latest_observation_ref) !== String(stored.latest_observation_ref)) {
      return { ok: false, reason: CREATE_BLOCKED.LINK_PAYLOAD_CONFLICT, link: null };
    }
    const mapped = fromLinkRecord(racedRow);
    if (!mapped.ok) return { ok: false, reason: mapped.reason, link: null };
    return { ok: true, idempotent: true, link: mapped.link };
  }

  async function backendPid() {
    const result = await query("SELECT pg_backend_pid() AS pid");
    return result && result.rows && result.rows[0] ? Number(result.rows[0].pid) : null;
  }

  async function withTransaction(fn) {
    if (inTransaction) {
      throw new Error("NESTED_TRANSACTION_FORBIDDEN");
    }
    inTransaction = true;
    let firstPid = null;
    let lastPid = null;
    try {
      await query("BEGIN");
      firstPid = await backendPid();
      const result = await fn({
        createProduct,
        enrichAttributes,
        attachLink,
        getProduct,
        getByIdentityKey,
        getProductIdByObservationRef,
        getIdentityKey,
        listLinks,
        listProducts,
        persistence: persistenceStatus,
      });
      lastPid = await backendPid();
      if (firstPid == null || lastPid == null || firstPid !== lastPid) {
        await query("ROLLBACK");
        return {
          ok: false,
          created: false,
          reason: "TRANSACTION_CONNECTION_NOT_PINNED",
          product: null,
          links: [],
          identityKey: null,
          backendPidStart: firstPid,
          backendPidEnd: lastPid,
          persistence: persistenceStatus(),
        };
      }
      if (!result || result.ok === false) {
        await query("ROLLBACK");
        return {
          ...(result || { ok: false, reason: "TRANSACTION_FAILED" }),
          backendPidStart: firstPid,
          backendPidEnd: lastPid,
        };
      }
      await query("COMMIT");
      return {
        ...result,
        backendPidStart: firstPid,
        backendPidEnd: lastPid,
      };
    } catch (err) {
      try {
        await query("ROLLBACK");
      } catch {
        // rollback best-effort
      }
      throw err;
    } finally {
      inTransaction = false;
    }
  }

  async function end() {
    if (typeof querier.end === "function") {
      await querier.end();
    }
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
    withTransaction,
    backendPid,
    persistence: persistenceStatus,
    end,
  };
}

module.exports = {
  createDurableCanonicalProductRepository,
};
