/**
 * SourceObservation durable repository — existing Postgres/Supabase owner.
 * PRODUCTION write는 이 모듈이 자동으로 하지 않는다. querier DI만.
 * memory fallback 금지.
 */

const { validateObservation } = require("./validate.cjs");
const { toPersistenceRecord, fromPersistenceRecord } = require("./persistence-mapper.cjs");

const INSERT_OBSERVATION_SQL = `
INSERT INTO public.source_observations (
  id,
  source,
  external_item_id,
  observation_purpose,
  source_status,
  url,
  observed_at,
  payload,
  content_fingerprint
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
ON CONFLICT (id) DO NOTHING
RETURNING *
`.trim();

const SELECT_BY_ID_SQL = `
SELECT *
FROM public.source_observations
WHERE id = $1
`.trim();

const SELECT_BY_SOURCE_ITEM_SQL = `
SELECT *
FROM public.source_observations
WHERE source = $1
  AND external_item_id = $2
ORDER BY observed_at ASC, created_at ASC
`.trim();

function classifyDurableDatabaseUrl(url) {
  if (url == null || String(url).trim() === "") {
    return { ok: false, reason: "DATABASE_URL_UNSET" };
  }
  const raw = String(url);
  if (/mgsytcetsiecllmhcyox/i.test(raw) || /supabase\.co/i.test(raw)) {
    return { ok: false, reason: "BLOCKED_NO_SAFE_DB" };
  }
  return { ok: true };
}

function createDurableSourceObservationRepository(input) {
  const querier = input && input.querier;
  if (!querier || typeof querier.query !== "function") {
    throw new Error("DURABLE_REPOSITORY_REQUIRES_QUERIER");
  }

  async function readMapped(row) {
    const mapped = fromPersistenceRecord(row);
    if (!mapped.ok) return mapped;
    return { ok: true, observation: mapped.observation, record: row };
  }

  async function getByObservationId(id) {
    let result;
    try {
      result = await querier.query(SELECT_BY_ID_SQL, [id]);
    } catch (err) {
      return {
        ok: false,
        persistenceStatus: "FAIL",
        reason: "SOURCE_OBSERVATION_DURABLE_PERSISTENCE_FAIL",
        detail: err instanceof Error ? err.message : "query_failed",
      };
    }
    const row = result && result.rows && result.rows[0];
    if (!row) {
      return { ok: false, persistenceStatus: "NOT_FOUND", reason: "OBSERVATION_NOT_FOUND" };
    }
    const mapped = await readMapped(row);
    if (!mapped.ok) {
      return {
        ok: false,
        persistenceStatus: "FAIL",
        reason: mapped.reason,
        failures: mapped.failures,
      };
    }
    return {
      ok: true,
      persistenceStatus: "READ",
      observation: mapped.observation,
    };
  }

  async function listBySourceItem(source, externalItemId) {
    let result;
    try {
      result = await querier.query(SELECT_BY_SOURCE_ITEM_SQL, [source, externalItemId]);
    } catch (err) {
      return {
        ok: false,
        persistenceStatus: "FAIL",
        reason: "SOURCE_OBSERVATION_DURABLE_PERSISTENCE_FAIL",
        detail: err instanceof Error ? err.message : "query_failed",
      };
    }
    const rows = (result && result.rows) || [];
    const observations = [];
    for (const row of rows) {
      const mapped = fromPersistenceRecord(row);
      if (!mapped.ok) {
        return {
          ok: false,
          persistenceStatus: "FAIL",
          reason: mapped.reason,
          failures: mapped.failures,
        };
      }
      observations.push(mapped.observation);
    }
    return { ok: true, persistenceStatus: "READ", observations };
  }

  async function appendObservation(obs) {
    const checked = validateObservation(obs);
    if (!checked.ok) {
      return {
        ok: false,
        persistenceStatus: "BLOCKED_VALIDATION",
        sourceStatus: checked.sourceStatus,
        reason: checked.reason,
        failures: checked.failures,
      };
    }

    const mapped = toPersistenceRecord(checked.observation);
    if (!mapped.ok) {
      return {
        ok: false,
        persistenceStatus: "BLOCKED_VALIDATION",
        sourceStatus: mapped.sourceStatus,
        reason: mapped.reason,
        failures: mapped.failures,
      };
    }
    const record = mapped.record;

    let inserted;
    try {
      inserted = await querier.query(INSERT_OBSERVATION_SQL, [
        record.id,
        record.source,
        record.external_item_id,
        record.observation_purpose,
        record.source_status,
        record.url,
        record.observed_at,
        JSON.stringify(record.payload),
        record.content_fingerprint,
      ]);
    } catch (err) {
      return {
        ok: false,
        persistenceStatus: "FAIL",
        reason: "SOURCE_OBSERVATION_DURABLE_PERSISTENCE_FAIL",
        detail: err instanceof Error ? err.message : "insert_failed",
      };
    }

    const insertedRow = inserted && inserted.rows && inserted.rows[0];
    if (insertedRow) {
      const readBack = fromPersistenceRecord(insertedRow);
      if (!readBack.ok) {
        return {
          ok: false,
          persistenceStatus: "FAIL",
          reason: readBack.reason,
          failures: readBack.failures,
        };
      }
      return {
        ok: true,
        persistenceStatus: "INSERTED",
        observation: readBack.observation,
      };
    }

    const existing = await getByObservationId(record.id);
    if (!existing.ok) {
      return {
        ok: false,
        persistenceStatus: "FAIL",
        reason: "CONFLICT_RACE_MISSING_ROW",
      };
    }
    const existingMapped = toPersistenceRecord(existing.observation);
    if (!existingMapped.ok) {
      return {
        ok: false,
        persistenceStatus: "FAIL",
        reason: existingMapped.reason,
        failures: existingMapped.failures,
      };
    }
    if (existingMapped.record.content_fingerprint === record.content_fingerprint) {
      return {
        ok: true,
        persistenceStatus: "IDEMPOTENT_SUCCESS",
        observation: existing.observation,
      };
    }
    return {
      ok: false,
      persistenceStatus: "BLOCKED_CONFLICT",
      reason: "OBSERVATION_ID_PAYLOAD_CONFLICT",
    };
  }

  async function end() {
    if (typeof querier.end === "function") {
      await querier.end();
    }
  }

  return {
    appendObservation,
    getByObservationId,
    listBySourceItem,
    end,
  };
}

module.exports = {
  INSERT_OBSERVATION_SQL,
  SELECT_BY_ID_SQL,
  SELECT_BY_SOURCE_ITEM_SQL,
  classifyDurableDatabaseUrl,
  createDurableSourceObservationRepository,
};
