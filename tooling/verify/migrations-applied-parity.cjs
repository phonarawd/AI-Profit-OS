/**
 * verify:migrations-applied-parity
 * 로컬 supabase/migrations 버전 접두사 ↔ fixtures/migrations-applied.v1.json (원격 applied 스냅샷) 1:1
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
    const localSet = new Set(localVersions);
    const expectedSet = new Set(expected);
    for (const v of expected) {
      if (!localSet.has(v)) fails.push(`remote-applied missing locally: ${v}`);
    }
    for (const v of localVersions) {
      if (!expectedSet.has(v)) {
        fails.push(
          `local-only version (update fixture after remote apply): ${v}`,
        );
      }
    }
    if (
      fails.length === 0 &&
      localVersions.length !== expected.length
    ) {
      fails.push(
        `count mismatch local=${localVersions.length} fixture=${expected.length}`,
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
