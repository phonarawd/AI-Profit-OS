"use strict";

const assert = require("node:assert/strict");
const posting = require("./operator-mall-ledger-posting.cjs");

const uid = "11111111-1111-4111-8111-111111111111";
const lines = posting.mallSettlementLines(uid, "4.25");
assert.equal(lines.length, 2);
assert.equal(lines[0].account.systemCode, posting.SYSTEM_OPPORTUNITY_POOL);
assert.equal(lines[0].direction, "debit");
assert.equal(lines[1].account.userId, uid);
assert.equal(lines[1].account.bucket, "profit");
assert.equal(lines[1].direction, "credit");
assert.equal(lines[1].amountUsdt, "4.25");
assert.equal(
  lines.some((l) => l.account && l.account.bucket === "practice"),
  false,
);
assert.equal(
  lines.some((l) => l.account && l.account.bucket === "principal"),
  false,
);

const mapped = posting.mapPostedJournal(
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    idempotencyKey: "settlement:p1",
    journalType: "settlement",
    referenceType: "participation",
    referenceId: "p1",
    reused: true,
    entries: [{ direction: "credit", amountUsdt: "4.25" }],
  },
  uid,
  "4.25",
);
assert.equal(mapped.reused, true);
assert.equal(mapped.amountUsdt, "4.25");
assert.equal(mapped.id, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");

console.log("[operator-mall-ledger-posting.isolation] PASS reuse_trade_profit_leg");
