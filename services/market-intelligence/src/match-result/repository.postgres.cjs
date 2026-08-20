/**
 * MatchResult durable repository — querier DI only.
 * production URL 판정/쓰기를 하지 않는다. matcher 로직을 넣지 않는다.
 * 단일 INSERT + UNIQUE(pair, version)이 race owner. 불필요 transaction 없음.
 */

const { PERSISTENCE_STATUS, PERSIST_BLOCKED } = require("./contract.cjs");
const {
  toPersistenceRecord,
  fromPersistenceRecord,
  normalizePair,
} = require("./persistence-mapper.cjs");

const INSERT_SQL = `
INSERT INTO public.match_results (
  match_result_id,
  pair_lo,
  pair_hi,
  left_observation_id,
  right_observation_id,
  left_source,
  right_source,
  matcher_version,
  category_profile,
  decision,
  match_path,
  matching_decision_eligible,
  final_truth_eligible,
  evidence,
  conflicts,
  semantics_fingerprint,
  payload,
  evaluated_at
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15::jsonb, $16, $17::jsonb, $18
)
ON CONFLICT (pair_lo, pair_hi, matcher_version) DO NOTHING
RETURNING *
`.trim();

const SELECT_BY_ID_SQL = `
SELECT * FROM public.match_results WHERE match_result_id = $1
`.trim();

const SELECT_BY_PAIR_SQL = `
SELECT * FROM public.match_results
WHERE pair_lo = $1 AND pair_hi = $2 AND matcher_version = $3
`.trim();

const COUNT_BY_PAIR_SQL = `
SELECT count(*)::int AS n
FROM public.match_results
WHERE pair_lo = $1 AND pair_hi = $2 AND matcher_version = $3
`.trim();

function persistenceStatus() {
  return { ...PERSISTENCE_STATUS };
}

function fail(reason, extras) {
  return {
    ok: false,
    persisted: false,
    idempotent: false,
    reason,
    matchResult: null,
    persistence: persistenceStatus(),
    ...(extras || {}),
  };
}

function okResult(matchResult, idempotent, extras) {
  return {
    ok: true,
    persisted: true,
    idempotent,
    reason: idempotent ? "IDEMPOTENT" : "INSERTED",
    matchResult,
    persistence: persistenceStatus(),
    ...(extras || {}),
  };
}

function mapDbError(err) {
  const code = err && err.code;
  if (code === "23503") {
    return fail(PERSIST_BLOCKED.SOURCE_REF, { detail: "foreign_key" });
  }
  if (code === "23514" || code === "23502") {
    return fail(PERSIST_BLOCKED.MALFORMED, { detail: code });
  }
  return fail("MATCH_RESULT_DURABLE_PERSISTENCE_FAIL", {
    detail: err instanceof Error ? err.message : "query_failed",
  });
}

function createDurableMatchResultRepository(input) {
  const querier = input && input.querier;
  if (!querier || typeof querier.query !== "function") {
    throw new Error("DURABLE_REPOSITORY_REQUIRES_QUERIER");
  }

  async function query(text, params) {
    return querier.query(text, params);
  }

  async function getById(matchResultId) {
    let result;
    try {
      result = await query(SELECT_BY_ID_SQL, [matchResultId]);
    } catch (err) {
      return mapDbError(err);
    }
    const row = result && result.rows && result.rows[0];
    if (!row) return fail("MATCH_RESULT_NOT_FOUND");
    const mapped = fromPersistenceRecord(row);
    if (!mapped.ok) return fail(mapped.reason, { failures: mapped.failures });
    return okResult(mapped.matchResult, true);
  }

  async function getByPair(leftObservationId, rightObservationId, matcherVersion) {
    const pair = normalizePair(leftObservationId, rightObservationId);
    let result;
    try {
      result = await query(SELECT_BY_PAIR_SQL, [pair.pairLo, pair.pairHi, matcherVersion]);
    } catch (err) {
      return mapDbError(err);
    }
    const row = result && result.rows && result.rows[0];
    if (!row) return fail("MATCH_RESULT_NOT_FOUND");
    const mapped = fromPersistenceRecord(row);
    if (!mapped.ok) return fail(mapped.reason, { failures: mapped.failures });
    return okResult(mapped.matchResult, true);
  }

  async function countByPair(leftObservationId, rightObservationId, matcherVersion) {
    const pair = normalizePair(leftObservationId, rightObservationId);
    const result = await query(COUNT_BY_PAIR_SQL, [pair.pairLo, pair.pairHi, matcherVersion]);
    return result && result.rows && result.rows[0] ? Number(result.rows[0].n) : 0;
  }

  async function save(matchResult) {
    const mapped = toPersistenceRecord(matchResult);
    if (!mapped.ok) {
      return fail(mapped.reason, { failures: mapped.failures });
    }
    const record = mapped.record;

    let inserted;
    try {
      inserted = await query(INSERT_SQL, [
        record.match_result_id,
        record.pair_lo,
        record.pair_hi,
        record.left_observation_id,
        record.right_observation_id,
        record.left_source,
        record.right_source,
        record.matcher_version,
        record.category_profile,
        record.decision,
        record.match_path,
        record.matching_decision_eligible,
        record.final_truth_eligible,
        JSON.stringify(record.evidence),
        JSON.stringify(record.conflicts),
        record.semantics_fingerprint,
        JSON.stringify(record.payload),
        record.evaluated_at,
      ]);
    } catch (err) {
      if (err && err.code === "23505") {
        const existing = await getByPair(
          record.left_observation_id,
          record.right_observation_id,
          record.matcher_version,
        );
        if (!existing.ok) return existing;
        const existingMapped = toPersistenceRecord(existing.matchResult);
        if (!existingMapped.ok) {
          return fail(existingMapped.reason, { failures: existingMapped.failures });
        }
        if (existingMapped.semanticsFingerprint === record.semantics_fingerprint) {
          return okResult(existing.matchResult, true);
        }
        return fail(PERSIST_BLOCKED.SEMANTICS_CONFLICT, {
          existingMatchResultId: existing.matchResult.matchResultId,
        });
      }
      return mapDbError(err);
    }

    const insertedRow = inserted && inserted.rows && inserted.rows[0];
    if (insertedRow) {
      const readBack = fromPersistenceRecord(insertedRow);
      if (!readBack.ok) return fail(readBack.reason, { failures: readBack.failures });
      return okResult(readBack.matchResult, false);
    }

    const existing = await getByPair(
      record.left_observation_id,
      record.right_observation_id,
      record.matcher_version,
    );
    if (!existing.ok) {
      return fail("CONFLICT_RACE_MISSING_ROW");
    }
    const existingMapped = toPersistenceRecord(existing.matchResult);
    if (!existingMapped.ok) {
      return fail(existingMapped.reason, { failures: existingMapped.failures });
    }
    if (existingMapped.semanticsFingerprint === record.semantics_fingerprint) {
      return okResult(existing.matchResult, true);
    }
    return fail(PERSIST_BLOCKED.SEMANTICS_CONFLICT, {
      existingMatchResultId: existing.matchResult.matchResultId,
    });
  }

  async function end() {
    if (typeof querier.end === "function") {
      await querier.end();
    }
  }

  return {
    save,
    getById,
    getByPair,
    countByPair,
    persistence: persistenceStatus,
    end,
  };
}

module.exports = {
  createDurableMatchResultRepository,
};
