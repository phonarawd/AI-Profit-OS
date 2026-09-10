import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const req = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const core = req(join(here, "..", "..", "ledger-user-query.core.cjs")) as {
  JOURNAL_DISPLAY: Record<string, { direction: string }>;
  addDecimal: (a: string, b: string) => string;
  customerJournalDisplay: (
    journalType: string,
    entries: Array<{ direction: string; amountUsdt: string }>,
  ) => {
    displayKey: string;
    labelKo: string;
    direction: string;
    customerVisible: boolean;
    amountUsdt: string | null;
    amountSource: string;
    multiEntryPolicy: string;
    status: string;
  };
  toUserJournalView: (
    journal: Record<string, unknown>,
    userId: string,
  ) => { display: { amountUsdt: string }; entries: unknown[] };
  fixtureStore: () => {
    journals: Array<{ journalType: string; entries: unknown[] }>;
  };
};

const ALL_TYPES = [
  "deposit_usdt",
  "deposit_krw",
  "withdraw",
  "withdraw_refund",
  "participate_lock",
  "participate_unlock",
  "settlement",
  "merge_profit_to_principal",
  "admin_adjust",
  "referral_reward",
  "referral_clawback",
  "practice_grant",
  "practice_expire",
  "mission_reward",
  "mission_clawback",
  "fee",
  "other",
];

describe("customer ledger display", () => {
  it("covers every journalType without floating Number", () => {
    for (const type of ALL_TYPES) {
      const display = core.customerJournalDisplay(type, [
        { direction: "credit", amountUsdt: "1.10", accountKind: "user_bucket" },
        { direction: "debit", amountUsdt: "0.10", accountKind: "user_bucket" },
      ]);
      assert.equal(typeof display.amountUsdt, "string");
      assert.equal(display.amountUsdt, "1");
      assert.equal(display.amountSource, "user_bucket_net");
      assert.equal(display.status, "posted");
      assert.equal(display.customerVisible, true);
      assert.ok(core.JOURNAL_DISPLAY[type]);
    }
    assert.equal(core.addDecimal("0.1", "0.2"), "0.3");
  });

  it("unknown type stays neutral/unknown label", () => {
    const display = core.customerJournalDisplay("not_a_type", []);
    assert.equal(display.displayKey, "ledger.unknown");
    assert.equal(display.direction, "neutral");
    assert.equal(display.labelKo, "확인 필요");
    assert.equal(display.amountUsdt, "0");
  });

  it("does not expose foreign user lines in fixture deposit", () => {
    const store = core.fixtureStore();
    const view = core.toUserJournalView(store.journals[0] as never, "user-a");
    assert.equal(view.display.amountUsdt, "10.5");
    assert.equal(view.entries.length, 2);
  });
});
