/**
 * verify:migrations-applied-parity
 * 로컬 supabase/migrations 버전 접두사 ↔ fixtures/migrations-applied.v1.json
 * versions[] = 원격 applied. committedUnapplied[] = file-only (원격 apply 전, REL-701-DB).
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const migDir = path.join(root, "supabase", "migrations");
const fixturePath = path.join(
  __dirname,
  "fixtures",
  "migrations-applied.v1.json",
);
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
    if (expected.length === 0) {
      fails.push("fixture.versions empty");
    }
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
    const dup = localVersions.filter(
      (v, i) => localVersions.indexOf(v) !== i,
    );
    for (const v of [...new Set(dup)]) {
      fails.push(`duplicate local version: ${v}`);
    }
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
      if (!localSet.has(v)) fails.push(`remote-applied missing locally: ${v}`);
    }
    for (const v of pending) {
      if (!v) continue;
      if (!localSet.has(v)) fails.push(`committedUnapplied missing locally: ${v}`);
      if (expectedSet.has(v)) {
        fails.push(
          `committedUnapplied also in versions (move after remote apply): ${v}`,
        );
      }
    }
    for (const v of localVersions) {
      if (!expectedSet.has(v) && !pendingSet.has(v)) {
        fails.push(
          `local-only version (update fixture after remote apply): ${v}`,
        );
      }
    }
    const accounted = expected.length + pendingSet.size;
    if (fails.length === 0 && localVersions.length !== accounted) {
      fails.push(
        `count mismatch local=${localVersions.length} applied=${expected.length} committedUnapplied=${pendingSet.size}`,
      );
    }
  }
}

if (fails.length) {
  console.error("[verify:migrations-applied-parity] FAIL");
  for (const f of fails) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  `[verify:migrations-applied-parity] PASS (${fs.readdirSync(migDir).filter((f) => f.endsWith(".sql")).length} files · fixture 1:1)`,
);
