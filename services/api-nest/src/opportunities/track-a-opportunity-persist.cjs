/**
 * Track A ISSUED row → 기존 Opportunity write owner.
 * production cron / worker / remote trigger 없음.
 * market-intelligence 는 여기로 INSERT 하지 않는다.
 */
const { mapIssuedToOpportunityRow } = require("./track-a-opportunity.mapper.cjs");
const {
  ensureFxSnapshot,
  insertIfAbsentByTrackAId,
  loadOpportunityRow,
} = require("./opportunity-write.cjs");

function blocked(reason, extras) {
  return {
    ok: false,
    persisted: false,
    idempotent: false,
    reason,
    opportunityId: null,
    row: null,
    productionPersisted: false,
    ...(extras || {}),
  };
}

async function persistQualifiedTrackAOpportunity(input) {
  const querier = input && input.querier;
  if (!querier || typeof querier.query !== "function") {
    return blocked("QUERIER_REQUIRED");
  }
  const mapped = mapIssuedToOpportunityRow({
    issued: input.issued,
    asset: input.asset,
  });
  if (!mapped.ok) return blocked(mapped.reason, { fieldMap: mapped.fieldMap });

  const fx = await ensureFxSnapshot(querier, input.fxSnapshot);
  if (!fx.ok) return blocked(fx.reason || "FX_SNAPSHOT_REQUIRED");
  if (mapped.row.fxSnapshotId !== (input.fxSnapshot && input.fxSnapshot.fxSnapshotId)) {
    return blocked("FX_SNAPSHOT_MISMATCH");
  }

  const written = await insertIfAbsentByTrackAId(querier, mapped.row);
  if (!written.ok) return blocked(written.reason, { opportunityId: written.id || null });

  const row = await loadOpportunityRow(querier, written.id);
  if (!row) return blocked("RELOAD_MISSING", { opportunityId: written.id });

  return {
    ok: true,
    persisted: true,
    idempotent: written.idempotent === true,
    reason: written.idempotent ? "IDEMPOTENT" : "INSERTED",
    opportunityId: written.id,
    row,
    fieldMap: mapped.fieldMap,
    productionPersisted: false,
  };
}

module.exports = {
  persistQualifiedTrackAOpportunity,
};
