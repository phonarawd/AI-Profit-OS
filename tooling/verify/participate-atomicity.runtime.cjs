/**
 * verify:participate-atomicity - PUTDUK continuation session, Step 7.1
 * required regression: "the participate_lock journal and the trade/
 * participate_request rows it accounts for must commit as one atomic
 * unit - a later failure must roll back the lock too, never leave
 * orphaned locked capital."
 *
 * ParticipateService.insertAccepted() posts real ledger money and had no
 * automated coverage for this exact atomicity property. This gate
 * confirms the regression suite exists, actually builds, and keeps
 * PASSing.
 *
 * ParticipateService/LedgerPostingService use TypeScript parameter
 * properties, so node:test + --experimental-strip-types (strip-only)
 * cannot run this directly - same compiled-dist convention as
 * trades.execution.race.selftest.ts / session-rotation.reuse.selftest.ts.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "../..");
const fails = [];

function fail(msg) {
  fails.push(msg);
}

function read(rel) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) {
    fail(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(fp, "utf8");
}

const testFile = "services/api-nest/src/opportunities/participate.atomicity.selftest.ts";
const svcFile = "services/api-nest/src/opportunities/participate.service.ts";
const postingFile = "services/api-nest/src/ledger/ledger.posting.service.ts";

const testSrc = read(testFile);
const svc = read(svcFile);
const posting = read(postingFile);
const pkg = read("package.json");
const domain = read("tooling/verify/domain-by-path.cjs");

for (const needle of [
  "insertAccepted",
  "rolls back the lock journal too",
  "does not double-lock",
]) {
  if (!testSrc.includes(needle)) {
    fail(`atomicity selftest missing coverage marker: ${needle}`);
  }
}
// The fix this suite guards: the lock journal and the trade/participate_
// request insert must be issued inside the SAME withTransaction callback.
if (!/postJournalInTransaction/.test(svc)) {
  fail(
    "participate.service.ts must post the lock journal via postJournalInTransaction inside its own withTransaction callback, not a separately-committed postJournal call",
  );
}
if (!/postJournalInTransaction/.test(posting)) {
  fail("ledger.posting.service.ts must export postJournalInTransaction");
}
if (!/drainOutboxAfterCommit/.test(posting)) {
  fail("ledger.posting.service.ts must export drainOutboxAfterCommit");
}
if (!pkg.includes('"verify:participate-atomicity"')) {
  fail("package.json missing verify:participate-atomicity");
}
if (!domain.includes("participate-atomicity.runtime.cjs")) {
  fail("domain-by-path must trigger participate-atomicity.runtime.cjs");
}

const tscBin = require.resolve("typescript/bin/tsc");
const build = spawnSync(
  process.execPath,
  [tscBin, "-p", path.join(root, "services/api-nest/tsconfig.json")],
  { cwd: root, encoding: "utf8" },
);
process.stdout.write(build.stdout || "");
process.stderr.write(build.stderr || "");
if (build.status !== 0) {
  fail("services/api-nest tsc build failed - cannot run participate.atomicity.selftest");
} else {
  const selftestJs = path.join(
    root,
    "services/api-nest/dist/opportunities/participate.atomicity.selftest.js",
  );
  if (!fs.existsSync(selftestJs)) {
    fail(`missing compiled selftest: ${selftestJs}`);
  } else {
    const run = spawnSync(process.execPath, [selftestJs], {
      cwd: root,
      encoding: "utf8",
      timeout: 30_000,
    });
    process.stdout.write(run.stdout || "");
    process.stderr.write(run.stderr || "");
    if (run.status !== 0 || !(run.stdout || "").includes("ALL PASS")) {
      fail("participate.atomicity.selftest did not report ALL PASS");
    }
  }
}

if (fails.length) {
  console.error("[verify:participate-atomicity] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:participate-atomicity] PASS - lock+trade atomic commit/rollback covered",
);
