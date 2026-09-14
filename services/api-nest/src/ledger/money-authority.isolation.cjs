"use strict";

const assert = require("node:assert/strict");
const { projectMoneyAuthority, rejectClientPayoutAuthority } = require("./money-authority.core.cjs");

const est = projectMoneyAuthority({
  expectedProfitUsdt: "12.5",
  configuredPayoutUsdt: "10",
});
assert.equal(est.expectedProfitUsdt, "12.5");
assert.equal(est.configuredPayoutUsdt, "10");
assert.equal(est.ledgerPaidUsdt, null);
assert.equal(est.payoutAuthoritative, false);

const settledNoJournal = projectMoneyAuthority({
  expectedProfitUsdt: "12.5",
  ledgerPaidUsdt: "12.5",
});
assert.equal(settledNoJournal.payoutAuthoritative, false);
assert.equal(settledNoJournal.ledgerPaidUsdt, null);

const paid = projectMoneyAuthority({
  expectedProfitUsdt: "12.5",
  configuredPayoutUsdt: "10",
  ledgerPaidUsdt: "10",
  ledgerJournalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
});
assert.equal(paid.payoutAuthoritative, true);
assert.equal(paid.ledgerPaidUsdt, "10");
assert.notEqual(paid.expectedProfitUsdt, paid.ledgerPaidUsdt);

const client = projectMoneyAuthority({
  expectedProfitUsdt: "99",
  ledgerPaidUsdt: "99",
  ledgerJournalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  clientComputedUsdt: "99",
});
assert.equal(client.payoutAuthoritative, false);
assert.equal(rejectClientPayoutAuthority({ clientComputedUsdt: "1" }).code, "CLIENT_PAYOUT_NOT_AUTHORITY");

console.log("[money-authority.isolation] PASS (expected != paid authority)");
