/**
 * verify:committed-event-publication-durability — Money post-r0
 * TX outbox intent · emit≠ack · drain/replay path · Phase0 Postgres
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}
function read(rel) {
  const p = path.join(root, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

mustExist("supabase/migrations/20260811062100_ledger_outbox_events.sql");
mustExist("services/api-nest/src/ledger/ledger.outbox.service.ts");
mustExist("services/api-nest/src/ledger/ledger.posting.service.ts");
mustExist("services/api-nest/src/ledger/ledger.module.ts");

const mig = read("supabase/migrations/20260811062100_ledger_outbox_events.sql");
if (!mig.includes("ledger_outbox_events")) {
  fails.push("migration must create ledger_outbox_events");
}
if (!mig.includes("published_at")) {
  fails.push("outbox must have published_at");
}

const posting = read("services/api-nest/src/ledger/ledger.posting.service.ts");
if (!/INSERT INTO public\.ledger_outbox_events/.test(posting)) {
  fails.push("postJournal TX must INSERT ledger_outbox_events");
}
if (/this\.bus\.emit\(LEDGER_EVENTS\.journalPosted/.test(posting)) {
  fails.push("postJournal must not bus.emit journalPosted directly (outbox Owns)");
}
if (!posting.includes("outbox.drain")) {
  fails.push("postJournal must drain outbox after commit");
}

const outbox = read("services/api-nest/src/ledger/ledger.outbox.service.ts");
if (!outbox.includes("void this.bus.emit") && !outbox.includes("void this.bus.emit(")) {
  // allow either pattern that ignores emit return
  if (!/emit\([\s\S]*\)/.test(outbox) || !/published_at/.test(outbox)) {
    fails.push("outbox drain must emit and set published_at separately");
  }
}
if (!outbox.includes("published_at IS NULL")) {
  fails.push("outbox must select unpublished rows for replay");
}
if (/published_at[\s\S]*=[\s\S]*emit/.test(outbox) && outbox.includes("if (this.bus.emit")) {
  fails.push("must not gate published_at on emit() boolean return");
}

const mod = read("services/api-nest/src/ledger/ledger.module.ts");
if (!mod.includes("LedgerOutboxService")) {
  fails.push("LedgerModule must provide LedgerOutboxService");
}

const pkg = JSON.parse(read("package.json"));
if (!pkg.scripts?.["verify:committed-event-publication-durability"]) {
  fails.push("package.json missing verify:committed-event-publication-durability");
}
const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("committed-event-publication-durability")) {
  fails.push("CATALOG.md missing committed-event-publication-durability");
}

if (fails.length) {
  console.error("[verify:committed-event-publication-durability] FAIL");
  for (const f of fails) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  "[verify:committed-event-publication-durability] PASS (TX outbox · emit≠ack · drain · catalog)",
);
