/**
 * verify:mission-idempotency — Money §51.8a.1
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

const acc = JSON.parse(
  fs.readFileSync(path.join(root, "schemas/mission-accrual.v1.json"), "utf8"),
);
if (!acc.required.includes("idempotencyKey")) {
  fails.push("mission-accrual must require idempotencyKey");
}

const money = fs.readFileSync(
  path.join(root, ".cursor/plans/ai_profit_os_01_money_c3d4e5f6.plan.md"),
  "utf8",
);
for (const key of [
  "mission:{userId}:{missionId}",
  "ON CONFLICT (idempotency_key) DO NOTHING",
  "source_event_id",
]) {
  if (!money.includes(key)) fails.push(`Money §51.8a missing: ${key}`);
}

if (fails.length) {
  console.error("[verify:mission-idempotency] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:mission-idempotency] PASS");
