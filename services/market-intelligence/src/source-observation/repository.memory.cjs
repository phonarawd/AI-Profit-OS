/**
 * In-memory SourceItem + append-only SourceObservation.
 * PRODUCTION_OBSERVATION_PERSISTENCE = NOT_IMPLEMENTED
 * OBSERVATION_DB_RUNTIME = BLOCKED_LOCAL_ENV
 */

const crypto = require("node:crypto");

function fingerprintObservation(obs) {
  const payload = {
    source: obs.source,
    externalItemId: obs.externalItemId,
    url: obs.url,
    title: obs.title,
    imageUrl: obs.imageUrl,
    nativeAmount: obs.nativeAmount ?? null,
    nativeCurrency: obs.nativeCurrency ?? null,
    observationPurpose: obs.observationPurpose,
    sourceStatus: obs.sourceStatus,
    availability: obs.availability ?? null,
    parserVersion: obs.parserVersion,
    priceKind: obs.meta && obs.meta.priceKind,
  };
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function createMemoryRepository() {
  /** @type {Map<string, object>} */
  const items = new Map();
  /** @type {object[]} */
  const observations = [];

  function itemKey(source, externalItemId) {
    return `${source}::${externalItemId}`;
  }

  function upsertSourceItem({ source, externalItemId, url, now }) {
    if (!source || !externalItemId) {
      throw new Error("sourceItem requires source + externalItemId");
    }
    const key = itemKey(source, externalItemId);
    const at = now || new Date().toISOString();
    const prev = items.get(key);
    if (prev) {
      prev.lastSeenAt = at;
      if (url) prev.canonicalUrl = url;
      return { item: prev, created: false };
    }
    const item = {
      id: `sit_${crypto.randomUUID()}`,
      source,
      externalItemId,
      canonicalUrl: url || null,
      firstSeenAt: at,
      lastSeenAt: at,
    };
    items.set(key, item);
    return { item, created: true };
  }

  function appendObservation(obs) {
    const fp = fingerprintObservation(obs);
    const dup = observations.find(
      (row) =>
        row.source === obs.source &&
        row.externalItemId === obs.externalItemId &&
        row.contentFingerprint === fp &&
        row.observedAt === obs.observedAt,
    );
    if (dup) {
      return { stored: false, reason: "idempotent_skip", observation: dup };
    }
    const { item } = upsertSourceItem({
      source: obs.source,
      externalItemId: obs.externalItemId,
      url: obs.url,
      now: obs.observedAt,
    });
    const row = {
      id: obs.id,
      sourceItemId: item.id,
      source: obs.source,
      externalItemId: obs.externalItemId,
      contentFingerprint: fp,
      ...obs,
    };
    delete row.assetId;
    observations.push(row);
    return { stored: true, observation: row, item };
  }

  function getSourceItem(source, externalItemId) {
    return items.get(itemKey(source, externalItemId)) || null;
  }

  function listObservations(source, externalItemId) {
    return observations.filter(
      (row) => row.source === source && row.externalItemId === externalItemId,
    );
  }

  function listSourceItems() {
    return [...items.values()];
  }

  function listAllObservations() {
    return [...observations];
  }

  return {
    upsertSourceItem,
    appendObservation,
    getSourceItem,
    listObservations,
    listSourceItems,
    listAllObservations,
    fingerprintObservation,
  };
}

module.exports = {
  createMemoryRepository,
  fingerprintObservation,
};
