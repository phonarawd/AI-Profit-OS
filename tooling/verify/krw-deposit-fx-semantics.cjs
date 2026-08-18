/**
 * verify:krw-deposit-fx-semantics — HC6-08 backend semantic gaps
 * Quote + applied FX first-class facts · consumer own-read · crash-safe approve
 * Home current-FX unused · client krwToUsdt 0 · principal-only credit
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const files = {
  svc:
    read("services/api-nest/src/wallet/krw-deposit.service.ts") +
    "\n" +
    read("services/api-nest/src/wallet/krw-deposit.apply.ts"),
  money: read("services/api-nest/src/wallet/krw-deposit.money.ts"),
  fx: read("services/api-nest/src/wallet/krw-deposit.fx.ts"),
  user: read("services/api-nest/src/wallet/wallet.controller.ts"),
  admin: read("services/api-nest/src/wallet/krw-deposit.admin.controller.ts"),
  sdkFetch: read("packages/sdk/src/wallet/fetch.ts"),
  sdkIdx: read("packages/sdk/src/wallet/index.ts"),
  schema: read("schemas/krw-deposit-request.v1.json"),
  mig: read("supabase/migrations/20260818010000_krw_deposit_fx_facts.sql"),
};

for (const [name, src] of Object.entries(files)) {
  if (!src) continue;
  if (/current-fx|currentFx|approxKrwFromSnapshot|\/me\/current-fx/.test(src)) {
    fails.push(`${name} must not use Home current-FX`);
  }
}

if (!/trunc18|payableKrw \* pow \* pow/.test(files.money) && !/numer = BigInt\(payableKrw\) \* pow \* pow/.test(files.money)) {
  fails.push("deposit money helper must keep truncating bigint division");
}
if (!files.money.includes("10n ** SCALE") || !files.money.includes("numer / rate")) {
  fails.push("deposit conversion must remain scale-18 trunc toward zero");
}

if (!files.fx.includes("ORDER BY captured_at DESC")) {
  fails.push("deposit FX helper must select latest snapshot by captured_at");
}
if (!files.fx.includes("usd_krw::text")) {
  fails.push("deposit FX helper must read fx_snapshots.usd_krw as text");
}

for (const needle of [
  "getByIdempotencyKey",
  "finalizeFromJournal",
  "krw_deposit_approve:",
  'bucket: "principal"',
  'journalType: "deposit_krw"',
  "credited_usdt",
  "quote_fx_snapshot_id",
  "applied_fx_snapshot_id",
  "listForUser",
  "getForUser",
]) {
  if (!files.svc.includes(needle)) {
    fails.push(`krw-deposit.service missing: ${needle}`);
  }
}

if (/from "\.\.\/current-fx|from "\.\/current-fx/.test(files.svc)) {
  fails.push("deposit service must not import current-fx");
}

const rejectStart = files.svc.indexOf("async reject(");
if (rejectStart < 0) {
  fails.push("reject() required");
} else {
  const rejectBody = files.svc.slice(
    rejectStart,
    files.svc.indexOf("\n  async ", rejectStart + 1),
  );
  if (/postJournal/.test(rejectBody)) {
    fails.push("reject() must not postJournal");
  }
}

if (!files.user.includes("listKrwDeposits") || !files.user.includes("getKrwDeposit")) {
  fails.push("consumer GET list/detail required");
}
if (!files.user.includes("this.sessionUserId(req)")) {
  fails.push("consumer reads must use session user");
}
if (!files.admin.includes("getById") || !files.admin.includes("krwDepositRequestById")) {
  fails.push("admin detail GET required for explainability");
}

if (!files.sdkIdx.includes("listKrwDepositRequests") || !files.sdkIdx.includes("getKrwDepositRequest")) {
  fails.push("SDK must export consumer deposit reads");
}
if (!files.sdkIdx.includes("createKrwDepositRequest")) {
  fails.push("SDK must export createKrwDepositRequest");
}
if (/krwToUsdt|payableAmountKrw\s*\/|\/\s*usdtKrw/.test(files.sdkFetch)) {
  fails.push("SDK must not compute KRW→USDT");
}
if (!files.sdkFetch.includes("normalizeKrwDepositRequest")) {
  fails.push("SDK must normalize server facts only");
}

const schema = JSON.parse(files.schema || "{}");
if (!schema.properties?.quote || !schema.properties?.final) {
  fails.push("schema must declare quote and final");
}
if (schema.properties?.payableSuffixRole?.const !== "bank_transfer_identification") {
  fails.push("schema payableSuffixRole const missing");
}

if (!files.mig.includes("ADD COLUMN IF NOT EXISTS estimated_usdt")) {
  fails.push("migration must add estimated_usdt additively");
}
if (!files.mig.includes("ADD COLUMN IF NOT EXISTS credited_usdt")) {
  fails.push("migration must add credited_usdt additively");
}
if (/DELETE FROM public\.krw_deposit_requests|UPDATE public\.fx_snapshots/i.test(files.mig)) {
  fails.push("migration must not delete deposit rows or update fx_snapshots");
}

if (fails.length) {
  console.error("[verify:krw-deposit-fx-semantics] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:krw-deposit-fx-semantics] PASS (quote+applied facts · own-read · no Home current-FX · client calc 0)",
);
