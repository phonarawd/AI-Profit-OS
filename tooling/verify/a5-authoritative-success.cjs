/**
 * A5 — compareReady/timer/fixture cannot pay. Event is consumed once per trade.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "../..");
const fails = [];
const fail = (msg) => fails.push(msg);

function read(rel) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) {
    fail("missing: " + rel);
    return "";
  }
  return fs.readFileSync(fp, "utf8");
}

const plan = read("services/api-nest/src/trades/authoritative-success.ts");
if (!plan.includes("planAuthoritativePayout") || !plan.includes('"wait"')) {
  fail("planner must keep compareReady-only as wait");
}
if (!plan.includes("CONSUME_CONFIRMATION_SQL") || !plan.includes("FOR UPDATE")) {
  fail("consume SQL must lock the open event");
}

const exec = read("services/api-nest/src/trades/trades.execution.service.ts");
if (!exec.includes("planAuthoritativePayout") || !exec.includes("peekAuthoritativeEvent")) {
  fail("executeTick must plan payout against an authoritative event");
}
if (!exec.includes("CONSUME_CONFIRMATION_SQL")) {
  fail("finalizeMatchSuccess must consume the event in the same TX");
}

const internal = read("services/api-nest/src/trades/trades.internal.controller.ts");
if (!internal.includes("execution-confirm") || !internal.includes("ingestAuthoritativeEvent")) {
  fail("machine ingest must exist and stay behind the internal token");
}

const mig = read(
  "supabase/migrations/20260906060000_payout_reservation_and_execution_confirm.sql",
);
if (!mig.includes("trade_execution_confirmations")) {
  fail("unapplied migration must create trade_execution_confirmations");
}

const pkg = read("package.json");
if (!pkg.includes('"verify:a5-authoritative-success"')) {
  fail("package.json missing verify:a5-authoritative-success");
}

const testFile = path.join(
  root,
  "services/api-nest/src/trades/authoritative-success.runtime.test.ts",
);
const run = spawnSync(
  process.execPath,
  ["--experimental-strip-types", "--test", testFile],
  { cwd: root, encoding: "utf8" },
);
process.stdout.write(run.stdout || "");
process.stderr.write(run.stderr || "");
if (run.status !== 0) {
  fail("authoritative-success.runtime.test.ts failed");
}

if (fails.length) {
  console.error("[verify:a5-authoritative-success] FAIL");
  for (const f of fails) console.error("  - " + f);
  process.exit(1);
}
console.log(
  "[verify:a5-authoritative-success] PASS (compareReady wait · event consume · no invented payout)",
);
