/**
 * verify:migrations-applied-parity
 * Local supabase/migrations canonical versions ↔ audited remote migration truth.
 *
 * versions[] = canonical local version prefixes corresponding to remote-applied schema truth.
 * committedUnapplied[] = repo-only migrations awaiting REL-701-DB.
 * remoteRawAppliedCount + remoteHistoricalMappings preserve raw Supabase history so
 * apply-time aliases / historical duplicate rows cannot be hidden by canonicalization.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const migDir = path.join(root, "supabase", "migrations");
const fixturePath = path.join(__dirname, "fixtures", "migrations-applied.v1.json");
const fails = [];

if (!fs.existsSync(fixturePath)) {
  fails.push("missing tooling/verify/fixtures/migrations-applied.v1.json");
} else if (!fs.existsSync(migDir)) {
  fails.push("missing supabase/migrations");
} else {
  let fixture;
  try {
    fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  } catch {
    fails.push("migrations-applied.v1.json invalid JSON");
    fixture = null;
  }

  if (fixture) {
    const expected = Array.isArray(fixture.versions) ? fixture.versions : [];
    if (expected.length === 0) fails.push("fixture.versions empty");

    const files = fs
      .readdirSync(migDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    const localVersions = [];
    for (const f of files) {
      const m = f.match(/^(\d{14})_(.+)\.sql$/);
      if (!m) {
        fails.push(`bad migration filename: ${f}`);
        continue;
      }
      localVersions.push(m[1]);
    }

    const dup = localVersions.filter((v, i) => localVersions.indexOf(v) !== i);
    for (const v of [...new Set(dup)]) fails.push(`duplicate local version: ${v}`);

    const pendingRaw = Array.isArray(fixture.committedUnapplied)
      ? fixture.committedUnapplied
      : [];
    const pending = pendingRaw.map((item) =>
      typeof item === "string" ? item : String(item && item.version ? item.version : ""),
    );
    if (pending.some((v) => !/^\d{14}$/.test(v))) {
      fails.push("committedUnapplied entries must be 14-digit version prefixes");
    }

    const localSet = new Set(localVersions);
    const expectedSet = new Set(expected);
    const pendingSet = new Set(pending);

    for (const v of expected) {
      if (!/^\d{14}$/.test(v)) fails.push(`bad applied canonical version: ${v}`);
      if (!localSet.has(v)) fails.push(`remote-applied canonical missing locally: ${v}`);
    }
    for (const v of pending) {
      if (!v) continue;
      if (!localSet.has(v)) fails.push(`committedUnapplied missing locally: ${v}`);
      if (expectedSet.has(v)) {
        fails.push(`committedUnapplied also in versions (move after remote apply): ${v}`);
      }
    }
    for (const v of localVersions) {
      if (!expectedSet.has(v) && !pendingSet.has(v)) {
        fails.push(`local-only version (update audited fixture): ${v}`);
      }
    }

    const accounted = expected.length + pendingSet.size;
    if (fails.length === 0 && localVersions.length !== accounted) {
      fails.push(
        `count mismatch local=${localVersions.length} appliedCanonical=${expected.length} committedUnapplied=${pendingSet.size}`,
      );
    }

    const rawCount = fixture.remoteRawAppliedCount;
    const mappings = Array.isArray(fixture.remoteHistoricalMappings)
      ? fixture.remoteHistoricalMappings
      : [];
    if (!Number.isInteger(rawCount) || rawCount < 1) {
      fails.push("remoteRawAppliedCount must be a positive integer");
    }

    const seenRemote = new Set();
    let rawCountDelta = 0;
    for (const mapping of mappings) {
      const remoteVersion = String(mapping && mapping.remoteVersion ? mapping.remoteVersion : "");
      const localVersion = String(mapping && mapping.localVersion ? mapping.localVersion : "");
      const delta = Number(mapping && mapping.rawCountDelta);
      if (!/^\d{14}$/.test(remoteVersion)) {
        fails.push(`bad historical remoteVersion: ${remoteVersion || "<empty>"}`);
      }
      if (!/^\d{14}$/.test(localVersion) || !expectedSet.has(localVersion)) {
        fails.push(`historical mapping localVersion is not applied canonical: ${localVersion || "<empty>"}`);
      }
      if (seenRemote.has(remoteVersion)) fails.push(`duplicate historical remoteVersion: ${remoteVersion}`);
      seenRemote.add(remoteVersion);
      if (!Number.isInteger(delta) || delta < 0) {
        fails.push(`bad rawCountDelta for remoteVersion ${remoteVersion || "<empty>"}`);
      } else {
        rawCountDelta += delta;
      }
      if (!mapping || typeof mapping.name !== "string" || !mapping.name.trim()) {
        fails.push(`historical mapping missing name for ${remoteVersion || "<empty>"}`);
      }
    }

    if (Number.isInteger(rawCount)) {
      const expectedRawCount = expected.length + rawCountDelta;
      if (rawCount !== expectedRawCount) {
        fails.push(
          `remote raw count mismatch raw=${rawCount} canonical=${expected.length} historicalDelta=${rawCountDelta}`,
        );
      }
    }
  }
}

if (fails.length) {
  console.error("[verify:migrations-applied-parity] FAIL");
  for (const f of fails) console.error(`  - ${f}`);
  process.exit(1);
}
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
console.log(
  `[verify:migrations-applied-parity] PASS (${fs.readdirSync(migDir).filter((f) => f.endsWith(".sql")).length} local files · ${fixture.versions.length} applied canonical · ${fixture.remoteRawAppliedCount} remote raw rows)`,
);
