/**
 * verify:db-recovery — QA5 P1 (transient Postgres loss must not kill the API).
 *
 * 1. the Pool is created with exactly one `error` listener, registered at creation
 * 2. the handler never leaks credentials and never fakes success
 * 3. real EventEmitter lifecycle round-trip (dist/db/postgres-recovery.selftest.js)
 *
 * The end-to-end "same Nest pid survives a real outage" proof is the GitHub
 * Actions QA5 fault harness — this gate is the local, DB-free regression guard.
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const REL = "services/api-nest/src/db/postgres.ts";
const src = read(REL);

if (src) {
  if (!/pool\.on\("error"/.test(src)) {
    fails.push(`${REL}: Pool must register an "error" listener (unhandled = process exit)`);
  }
  const registrations = (src.match(/\.on\(\s*"error"/g) || []).length;
  if (registrations !== 1) {
    fails.push(
      `${REL}: expected exactly one "error" registration site, found ${registrations} (listener leak risk)`,
    );
  }
  const ensureBody = (src.match(/private ensurePool\(\)[\s\S]*?\n {2}\}/) || [""])[0];
  if (!/pool\.on\("error"/.test(ensureBody)) {
    fails.push(`${REL}: the listener must be attached where the Pool is created`);
  }
  if (!/if \(this\.pool\) return this\.pool;/.test(ensureBody)) {
    fails.push(`${REL}: ensurePool must reuse an existing Pool (otherwise listeners accumulate)`);
  }
  if (!/redactCredentials/.test(src)) {
    fails.push(`${REL}: background error logging must redact credentials`);
  }
  if (!/poolHealth\(\)/.test(src)) {
    fails.push(`${REL}: expose poolHealth() so the listener lifecycle is observable`);
  }
  if (/process\.exit|throw err/.test(src)) {
    fails.push(`${REL}: the background error handler must not terminate the process`);
  }
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  if (/connectionString[\s\S]{0,200}console\./.test(code)) {
    fails.push(`${REL}: never log near the connection string`);
  }
}

if (fails.length === 0) {
  const tscBin = require.resolve("typescript/bin/tsc");
  const build = spawnSync(
    process.execPath,
    [tscBin, "-p", path.join(root, "services/api-nest/tsconfig.json")],
    { cwd: root, encoding: "utf8" },
  );
  process.stdout.write(build.stdout || "");
  process.stderr.write(build.stderr || "");
  if (build.status !== 0) {
    fails.push("services/api-nest tsc build failed — cannot run postgres-recovery.selftest");
  } else {
    const selftestJs = path.join(
      root,
      "services/api-nest/dist/db/postgres-recovery.selftest.js",
    );
    if (!fs.existsSync(selftestJs)) {
      fails.push(`missing compiled selftest: ${selftestJs}`);
    } else {
      const run = spawnSync(process.execPath, [selftestJs], {
        cwd: root,
        encoding: "utf8",
        timeout: 60_000,
        env: { ...process.env, NODE_ENV: "test" },
      });
      process.stdout.write(run.stdout || "");
      process.stderr.write(run.stderr || "");
      if (run.status !== 0 || !(run.stdout || "").includes("ALL PASS")) {
        fails.push("postgres-recovery.selftest did not report ALL PASS");
      }
    }
  }
}

if (fails.length) {
  console.error("[verify:db-recovery] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:db-recovery] PASS (single pool error listener · credential redaction · no process exit · lifecycle round-trip)",
);
