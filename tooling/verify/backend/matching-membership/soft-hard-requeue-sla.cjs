/**
 * BACKEND-ONLY PORT of tooling/verify/soft-hard-requeue-sla.cjs (recovery base SHA 86f15964).
 * UI assertions (customer web / admin UI / shared UI package / client SDK) were recorded in
 * quality/putduk-web-ui-assertions-handoff.md and removed here; only backend
 * (services / schemas / supabase / workers / infra / governance) assertions remain.
 */
/**
 * verify:soft-hard-requeue-sla — Index §20.2 · Engine §48.13 · UI §48
 * Soft60/Hard90 · 카피3줄 · MATCH_TIMEOUT · presentation≠SLA · 전등급동일
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../../../..");
const fails = [];

// Schema + DDL: MATCH_TIMEOUT is a terminal result (SSOT lock; Rule impl = Engine todo)
const tradeSchemaPath = path.join(root, "schemas/trade-execution-state.v1.json");
if (!fs.existsSync(tradeSchemaPath)) {
  fails.push("missing schemas/trade-execution-state.v1.json");
} else {
  const trade = JSON.parse(fs.readFileSync(tradeSchemaPath, "utf8"));
  const codes =
    trade.properties?.resultCode?.enum ||
    trade.properties?.result_code?.enum ||
    (() => {
      const walk = (node, acc = []) => {
        if (!node || typeof node !== "object") return acc;
        if (Array.isArray(node.enum) && node.enum.includes("MATCH_TIMEOUT")) {
          acc.push(node.enum);
        }
        for (const v of Object.values(node)) walk(v, acc);
        return acc;
      };
      return walk(trade)[0];
    })();
  if (!codes || !codes.includes("MATCH_TIMEOUT")) {
    fails.push("trade-execution-state must enum MATCH_TIMEOUT");
  }
}

const migPath = path.join(
  root,
  "supabase/migrations/20260808205850_opportunities_pricing.sql",
);
if (!fs.existsSync(migPath)) {
  fails.push("missing opportunities_pricing migration");
} else {
  const mig = fs.readFileSync(migPath, "utf8");
  if (!/MATCH_TIMEOUT/.test(mig)) {
    fails.push("trade_executions DDL must allow MATCH_TIMEOUT");
  }
  if (!/'requeue'/.test(mig) && !/requeue/.test(mig)) {
    fails.push("trade_executions DDL must allow requeue status");
  }
}

if (fails.length) {
  console.error("[verify:soft-hard-requeue-sla] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:soft-hard-requeue-sla] PASS (MATCH_TIMEOUT schema enum + DDL · requeue status)");
