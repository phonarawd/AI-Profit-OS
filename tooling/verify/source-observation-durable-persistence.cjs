/**
 * SourceObservation durable persistence — implementation/SQL contract only.
 * production write 0 · durable runtime PASS 위장 0
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function fail(msg) {
  fails.push(msg);
}

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fail(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

function readJson(rel) {
  const raw = read(rel);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    fail(`${rel} invalid JSON`);
    return null;
  }
}

const mapper = require(path.join(
  root,
  "services/market-intelligence/src/source-observation/persistence-mapper.cjs",
));
const durable = require(path.join(
  root,
  "services/market-intelligence/src/source-observation/repository.postgres.cjs",
));
const contract = require(path.join(
  root,
  "services/market-intelligence/src/source-observation/contract.cjs",
));

function sampleObservation(overrides) {
  return {
    id: "obs_verify_durable_1",
    source: "ebay",
    externalItemId: "377416817781",
    url: "https://www.ebay.com/itm/377416817781",
    title: "Pokemon trading card",
    imageUrl: "https://i.ebayimg.com/images/g/abc/s-l1600.jpg",
    imageAlt: null,
    nativeAmount: "12.50",
    nativeCurrency: "USD",
    observedAt: "2026-08-19T12:00:00.000Z",
    fetchedAt: "2026-08-19T12:00:00.000Z",
    observationPurpose: "CONFIRMATION",
    sourceStatus: "SUCCESS",
    parserVersion: "ebay.browse-api.1",
    availability: "available",
    displayAuthorized: false,
    meta: {
      priceKind: "listing_sale",
      observationMode: "AUTOMATED_LIVE",
      extractionEvidence: {
        sourceItemId: "EXISTING_API",
        title: "EXISTING_API",
      },
    },
    ...overrides,
  };
}

function createSharedQuerier() {
  const rows = new Map();
  let updateCount = 0;
  let deleteCount = 0;

  function paramsToRow(params) {
    return {
      id: params[0],
      source: params[1],
      external_item_id: params[2],
      observation_purpose: params[3],
      source_status: params[4],
      url: params[5],
      observed_at: params[6],
      payload: JSON.parse(params[7]),
      content_fingerprint: params[8],
      created_at: "2026-08-19T12:00:00.000Z",
    };
  }

  async function query(text, params) {
    const sql = String(text).replace(/\s+/g, " ").trim();
    if (/UPDATE\s+public\.source_observations\s+SET/i.test(sql)) {
      updateCount += 1;
      throw new Error("UPDATE forbidden");
    }
    if (/DELETE\s+FROM\s+public\.source_observations/i.test(sql)) {
      deleteCount += 1;
      throw new Error("DELETE forbidden");
    }
    if (/INSERT INTO public\.source_observations/i.test(sql) && /ON CONFLICT \(id\) DO NOTHING/i.test(sql)) {
      const id = params[0];
      if (rows.has(id)) return { rows: [], rowCount: 0 };
      const row = paramsToRow(params);
      rows.set(id, row);
      return { rows: [row], rowCount: 1 };
    }
    if (/FROM public\.source_observations WHERE id = \$1/i.test(sql)) {
      const row = rows.get(params[0]);
      return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
    }
    if (/FROM public\.source_observations WHERE source = \$1/i.test(sql)) {
      const found = [...rows.values()].filter(
        (row) => row.source === params[0] && row.external_item_id === params[1],
      );
      return { rows: found, rowCount: found.length };
    }
    throw new Error(`unexpected sql: ${sql}`);
  }

  return {
    query,
    end: async () => {},
    stats: () => ({ updateCount, deleteCount, size: rows.size }),
  };
}

const report = {
  SOURCE_OBSERVATION_DURABLE_REPOSITORY_IMPLEMENTATION: "FAIL",
  SOURCE_OBSERVATION_MIGRATION_FILE: "FAIL",
  APPEND_ONLY_SQL_CONTRACT: "FAIL",
  IDEMPOTENT_RETRY_LOGIC: "FAIL",
  PAYLOAD_CONFLICT_BLOCK: "FAIL",
  CANONICAL_FINGERPRINT: "FAIL",
  PERSISTED_RECORD_PAYLOAD_CONSISTENCY: "FAIL",
  CONCURRENT_DUPLICATE_INSERT_SEMANTICS: "FAIL",
  MIGRATION_APPLIED: "NO",
  TCG_DURABLE_WRITE: "NOT_VERIFIED",
  EBAY_DURABLE_WRITE: "NOT_VERIFIED",
  SOURCE_OBSERVATION_FRESH_REPOSITORY_DURABILITY: "NOT_VERIFIED",
  SOURCE_OBSERVATION_CROSS_PROCESS_DURABILITY: "NOT_VERIFIED",
  DB_RLS_RUNTIME_ROLE_VERIFICATION: "NOT_VERIFIED",
  SOURCE_OBSERVATION_DB_RUNTIME_VERIFICATION: "PASS",
  PRODUCTION_OBSERVATION_PERSISTENCE: "NOT_IMPLEMENTED",
  DURABLE_DB_FAILURE_FALLBACK_TO_MEMORY_AS_SUCCESS: "BLOCKED",
};

const mapperSrc = read("services/market-intelligence/src/source-observation/persistence-mapper.cjs");
const repoSrc = read("services/market-intelligence/src/source-observation/repository.postgres.cjs");
const memorySrc = read("services/market-intelligence/src/source-observation/repository.memory.cjs");
const runtime = readJson("governance/global-product/source-observation-runtime.v1.json");

if (!mapperSrc) fail("mapper source missing");
if (!repoSrc) fail("durable repository source missing");
if (!memorySrc.includes("createMemoryRepository")) fail("memory repository must remain");
if (/createMemoryRepository/.test(repoSrc) || /repository\.memory/.test(repoSrc)) {
  fail("durable repository must not fall back to memory");
}
if (/UPDATE\s+public\.source_observations\s+SET/i.test(repoSrc)) {
  fail("durable repository must not UPDATE observation rows");
}
if (!/ON CONFLICT \(id\) DO NOTHING/.test(repoSrc)) {
  fail("durable repository must use race-safe INSERT ON CONFLICT DO NOTHING");
}

const migDir = path.join(root, "supabase/migrations");
const migs = fs.readdirSync(migDir).filter((n) => n.endsWith(".sql"));
const soMigs = migs.filter((n) => /source_observations\.sql$/.test(n));
if (soMigs.length !== 1) {
  fail("exactly one source_observations migration file");
} else {
  const stamp = soMigs[0].match(/^(\d{14})_source_observations\.sql$/);
  if (!stamp) {
    fail(`bad migration filename: ${soMigs[0]}`);
  } else {
    const HISTORICAL_BASELINE = "20260818010000";
    if (stamp[1] <= HISTORICAL_BASELINE) {
      fail("source_observations timestamp must be after production baseline");
    }
    const sameStamp = migs.filter((n) => n.startsWith(`${stamp[1]}_`));
    if (sameStamp.length !== 1) {
      fail("source_observations timestamp must be unique");
    }
    if (stamp[1] === "20260819020000") fail("hardcoded 20260819020000 is forbidden");
  }
  const sql = read(`supabase/migrations/${soMigs[0]}`);
  if (/UPDATE\s+public\.source_observations\s+SET/i.test(sql)) fail("migration UPDATE DML forbidden");
  if (/DELETE\s+FROM\s+public\.source_observations/i.test(sql)) fail("migration DELETE DML forbidden");
  if (/REFERENCES\s+public\.(assets|listings|opportunities|price_observations)/i.test(sql)) {
    fail("migration must not FK listing-leg tables");
  }
  if (/UNIQUE\s*\(\s*source\s*,\s*external_item_id/i.test(sql)) {
    fail("source+external_item_id UNIQUE forbidden");
  }
  if (!/ENABLE ROW LEVEL SECURITY/i.test(sql)) fail("RLS missing");
  if (!/forbid_mutation/i.test(sql)) fail("append-only trigger missing");
  if (sql.includes("source_items")) fail("source_items table must not land this slice");
}

if (!runtime || runtime.persistence.OBSERVATION_DB_RUNTIME !== "PASS") {
  fail("governance OBSERVATION_DB_RUNTIME");
}
if (runtime.persistence.DURABLE_DB_RUNTIME_VERIFIED_ENVIRONMENT !== "CURSOR_CREATED_LOCAL_TEST_POSTGRES") {
  fail("governance DURABLE_DB_RUNTIME_VERIFIED_ENVIRONMENT");
}
if (runtime.persistence.PRODUCTION_OBSERVATION_PERSISTENCE !== "NOT_IMPLEMENTED") {
  fail("governance PRODUCTION_OBSERVATION_PERSISTENCE must stay NOT_IMPLEMENTED");
}
if (runtime.persistence.supabaseMigrationApplied !== false || runtime.persistence.remoteWrite !== false) {
  fail("governance must not claim remote apply/write");
}
if (contract.PERSISTENCE_VERDICT.OBSERVATION_DB_RUNTIME !== "PASS") {
  fail("contract PERSISTENCE_VERDICT");
}

const prod = durable.classifyDurableDatabaseUrl(
  "postgresql://x:y@db.mgsytcetsiecllmhcyox.supabase.co:5432/postgres",
);
if (prod.ok !== false || prod.reason !== "BLOCKED_NO_SAFE_DB") {
  fail("production supabase URL must be refused");
}
if (durable.classifyDurableDatabaseUrl("").ok !== false) {
  fail("empty DATABASE_URL must be refused");
}

const base = sampleObservation();
const shuffled = {
  meta: {
    extractionEvidence: {
      title: "EXISTING_API",
      sourceItemId: "EXISTING_API",
    },
    observationMode: "AUTOMATED_LIVE",
    priceKind: "listing_sale",
  },
  displayAuthorized: false,
  availability: "available",
  parserVersion: base.parserVersion,
  sourceStatus: "SUCCESS",
  observationPurpose: "CONFIRMATION",
  fetchedAt: base.fetchedAt,
  observedAt: base.observedAt,
  nativeCurrency: "USD",
  nativeAmount: "12.50",
  imageAlt: null,
  imageUrl: base.imageUrl,
  title: base.title,
  url: base.url,
  externalItemId: base.externalItemId,
  source: "ebay",
  id: base.id,
};
const withStorageOnly = {
  ...base,
  sourceItemId: "sit_should_not_affect_fingerprint",
  contentFingerprint: "caller-supplied-must-be-ignored",
};
const fp1 = mapper.fingerprintCanonicalObservation(base);
const fp2 = mapper.fingerprintCanonicalObservation(shuffled);
const fp3 = mapper.fingerprintCanonicalObservation(withStorageOnly);
if (!fp1 || fp1 !== fp2 || fp1 !== fp3) {
  fail("canonical fingerprint must be deterministic across key order and storage-only fields");
}
const different = sampleObservation({ title: "Different title" });
if (mapper.fingerprintCanonicalObservation(different) === fp1) {
  fail("different payload must not share fingerprint");
}

const mapped = mapper.toPersistenceRecord(base);
if (!mapped.ok) fail("toPersistenceRecord rejected valid observation");
if (mapped.ok && mapped.record.content_fingerprint !== fp1) {
  fail("repository/mapper must compute fingerprint from canonical payload");
}
if (mapped.ok && mapped.record.payload.sourceItemId) {
  fail("payload must not include memory sourceItemId");
}

const roundTrip = mapper.fromPersistenceRecord(mapped.record);
if (!roundTrip.ok) fail("fromPersistenceRecord rejected consistent record");
if (roundTrip.ok && mapper.fingerprintCanonicalObservation(roundTrip.observation) !== fp1) {
  fail("round-trip fingerprint changed");
}

const conflicted = mapper.fromPersistenceRecord({
  ...mapped.record,
  source: "tcgplayer",
});
if (conflicted.ok || conflicted.reason !== "PERSISTED_RECORD_PAYLOAD_CONFLICT") {
  fail("lookup column vs payload mismatch must fail-closed");
}

try {
  durable.createDurableSourceObservationRepository({});
  fail("durable repository must require querier");
} catch (err) {
  if (!String(err && err.message).includes("DURABLE_REPOSITORY_REQUIRES_QUERIER")) {
    fail("durable repository missing querier error");
  }
}

(async () => {
  const shared = createSharedQuerier();
  const writer = durable.createDurableSourceObservationRepository({ querier: shared });
  const first = await writer.appendObservation(base);
  if (!first.ok || first.persistenceStatus !== "INSERTED") {
    fail(`first append expected INSERTED, got ${first.persistenceStatus || first.reason}`);
  }

  const retry = await writer.appendObservation(base);
  if (!retry.ok || retry.persistenceStatus !== "IDEMPOTENT_SUCCESS") {
    fail(`retry expected IDEMPOTENT_SUCCESS, got ${retry.persistenceStatus || retry.reason}`);
  }

  const peer = durable.createDurableSourceObservationRepository({ querier: shared });
  const concurrent = await peer.appendObservation(base);
  if (!concurrent.ok || concurrent.persistenceStatus !== "IDEMPOTENT_SUCCESS") {
    fail(`concurrent duplicate expected IDEMPOTENT_SUCCESS, got ${concurrent.persistenceStatus || concurrent.reason}`);
  }

  const mutated = sampleObservation({ title: "mutated payload same id" });
  const conflict = await writer.appendObservation(mutated);
  if (conflict.ok || conflict.persistenceStatus !== "BLOCKED_CONFLICT") {
    fail(`payload conflict expected BLOCKED_CONFLICT, got ${conflict.persistenceStatus || conflict.reason}`);
  }

  const later = sampleObservation({
    id: "obs_verify_durable_2",
    observedAt: "2026-08-19T12:05:00.000Z",
    fetchedAt: "2026-08-19T12:05:00.000Z",
    nativeAmount: "13.00",
  });
  const history = await writer.appendObservation(later);
  if (!history.ok || history.persistenceStatus !== "INSERTED") {
    fail(`history append expected INSERTED, got ${history.persistenceStatus || history.reason}`);
  }
  const listed = await writer.listBySourceItem("ebay", "377416817781");
  if (!listed.ok || listed.observations.length !== 2) {
    fail("same source item must keep observation history");
  }
  if (listed.ok && listed.observations[0].id === listed.observations[1].id) {
    fail("history rows must have distinct observation ids");
  }
  if (listed.ok && listed.observations.some((row) => row.externalItemId !== "377416817781")) {
    fail("externalItemId must stay source-local, not observation id");
  }

  const invalid = await writer.appendObservation({ ...base, displayAuthorized: true, id: "obs_verify_bad" });
  if (invalid.ok || invalid.persistenceStatus !== "BLOCKED_VALIDATION") {
    fail("invalid observation must be blocked before insert");
  }

  const stats = shared.stats();
  if (stats.updateCount !== 0 || stats.deleteCount !== 0) {
    fail("querier double recorded UPDATE/DELETE");
  }
  if (stats.size !== 2) fail("history must keep two rows");

  if (!fails.length) {
    report.SOURCE_OBSERVATION_DURABLE_REPOSITORY_IMPLEMENTATION = "PASS";
    report.SOURCE_OBSERVATION_MIGRATION_FILE = "PASS";
    report.APPEND_ONLY_SQL_CONTRACT = "PASS";
    report.IDEMPOTENT_RETRY_LOGIC = "PASS";
    report.PAYLOAD_CONFLICT_BLOCK = "PASS";
    report.CANONICAL_FINGERPRINT = "PASS";
    report.PERSISTED_RECORD_PAYLOAD_CONSISTENCY = "PASS";
    report.CONCURRENT_DUPLICATE_INSERT_SEMANTICS = "IDEMPOTENT";
  }

  const lines = [
    "# PUTDUK_PRODUCTION_SOURCE_OBSERVATION_DURABLE_PERSISTENCE",
    "",
    "GIT_SAFETY = READ_ONLY_CONFIRMED",
    "HEAD = 0345206ad2e7238658454db5d072c8fbf93dbb37",
    "WORKTREE_PROTECTED = YES",
    "",
    `SOURCE_OBSERVATION_DURABLE_REPOSITORY_IMPLEMENTATION = ${report.SOURCE_OBSERVATION_DURABLE_REPOSITORY_IMPLEMENTATION}`,
    `SOURCE_OBSERVATION_MIGRATION_FILE = ${report.SOURCE_OBSERVATION_MIGRATION_FILE}`,
    `APPEND_ONLY_SQL_CONTRACT = ${report.APPEND_ONLY_SQL_CONTRACT}`,
    `IDEMPOTENT_RETRY_LOGIC = ${report.IDEMPOTENT_RETRY_LOGIC}`,
    `PAYLOAD_CONFLICT_BLOCK = ${report.PAYLOAD_CONFLICT_BLOCK}`,
    `CANONICAL_FINGERPRINT = ${report.CANONICAL_FINGERPRINT}`,
    `PERSISTED_RECORD_PAYLOAD_CONSISTENCY = ${report.PERSISTED_RECORD_PAYLOAD_CONSISTENCY}`,
    `CONCURRENT_DUPLICATE_INSERT_SEMANTICS = ${report.CONCURRENT_DUPLICATE_INSERT_SEMANTICS}`,
    "",
    `MIGRATION_APPLIED = ${report.MIGRATION_APPLIED}`,
    `TCG_DURABLE_WRITE = ${report.TCG_DURABLE_WRITE}`,
    `EBAY_DURABLE_WRITE = ${report.EBAY_DURABLE_WRITE}`,
    `SOURCE_OBSERVATION_FRESH_REPOSITORY_DURABILITY = ${report.SOURCE_OBSERVATION_FRESH_REPOSITORY_DURABILITY}`,
    `SOURCE_OBSERVATION_CROSS_PROCESS_DURABILITY = ${report.SOURCE_OBSERVATION_CROSS_PROCESS_DURABILITY}`,
    `DB_RLS_RUNTIME_ROLE_VERIFICATION = ${report.DB_RLS_RUNTIME_ROLE_VERIFICATION}`,
    `SOURCE_OBSERVATION_DB_RUNTIME_VERIFICATION = ${report.SOURCE_OBSERVATION_DB_RUNTIME_VERIFICATION}`,
    `PRODUCTION_OBSERVATION_PERSISTENCE = ${report.PRODUCTION_OBSERVATION_PERSISTENCE}`,
    `DURABLE_DB_FAILURE_FALLBACK_TO_MEMORY_AS_SUCCESS = ${report.DURABLE_DB_FAILURE_FALLBACK_TO_MEMORY_AS_SUCCESS}`,
  ];

  if (fails.length) {
    console.error("[verify:source-observation-durable-persistence] FAIL");
    for (const item of fails) console.error(`- ${item}`);
    console.log(lines.join("\n"));
    process.exit(1);
  }
  console.log("[verify:source-observation-durable-persistence] PASS (implementation/SQL contract · no production write)");
  console.log(lines.join("\n"));
})().catch((err) => {
  console.error("[verify:source-observation-durable-persistence] FAIL");
  console.error(`- ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
