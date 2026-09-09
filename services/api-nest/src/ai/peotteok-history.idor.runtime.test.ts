import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  citationsFromFacts,
  titleFromUserText,
} from "./peotteok-citation.ts";

const historySrc = fs.readFileSync(
  path.join(import.meta.dirname, "peotteok-history.service.ts"),
  "utf8",
);

test("titleFromUserText empty becomes new conversation", () => {
  assert.equal(titleFromUserText("   "), "\uC0C8 \uB300\uD654");
  assert.ok(titleFromUserText("x".repeat(50)).endsWith("\u2026"));
});

test("citationsFromFacts keeps ids and links only", () => {
  const asOf = "2026-09-06T00:00:00.000Z";
  const out = citationsFromFacts(
    [
      {
        source: "opportunity",
        payload: { opportunityId: "opp-1", deepLink: "/profits/opp-1" },
      },
      { source: "ledger", payload: { liabilityUsdt: "999" } },
    ],
    asOf,
  );
  assert.equal(out.length, 2);
  assert.deepEqual(out[0], {
    kind: "opportunity",
    id: "opp-1",
    deepLink: "/profits/opp-1",
    asOf,
  });
  assert.deepEqual(out[1], { kind: "ledger", asOf });
  assert.equal(
    JSON.stringify(out).includes("999"),
    false,
    "ledger citation must not copy amounts",
  );
});

test("history SQL never looks up conversation id without user id", () => {
  const selects = historySrc.match(/`[\s\S]*?`/g) || [];
  const mutating = selects.filter((sql) =>
    /peotteok_conversations|peotteok_messages/.test(sql),
  );
  assert.ok(mutating.length >= 4);
  for (const sql of mutating) {
    if (/FROM public\.peotteok_conversations/.test(sql) || /UPDATE public\.peotteok_conversations/.test(sql) || /DELETE FROM public\.peotteok_conversations/.test(sql) || /INSERT INTO public\.peotteok_conversations/.test(sql) || /FROM public\.peotteok_messages/.test(sql) || /INSERT INTO public\.peotteok_messages/.test(sql)) {
      assert.match(sql, /user_id/i);
    }
  }
  assert.match(historySrc, /WHERE id = \$1::uuid AND user_id = \$2::uuid/);
  assert.match(historySrc, /WHERE peotteok_conversations\.user_id = \$2::uuid/);
  assert.equal(/WHERE id = \$1::uuid\s*`/.test(historySrc), false);
});
