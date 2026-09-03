import assert from "node:assert/strict";
import { test } from "node:test";
import {
  COINGECKO_MARKETPLACE_TTL_MS,
  FRANKFURTER_MARKETPLACE_TTL_MS,
  carryMarketplaceLeg,
  type RateProvenance,
} from "./fx-marketplace-freshness.ts";

const NOW = Date.parse("2026-09-03T13:00:00.000Z");

function provenance(
  leg: string,
  source: string,
  ageMs: number,
): RateProvenance {
  return {
    [leg]: {
      source,
      capturedAt: new Date(NOW - ageMs).toISOString(),
    },
  };
}

test("CoinGecko USDT leg expires on its own 15 minute provenance", () => {
  assert.equal(
    carryMarketplaceLeg(
      "usdtPerUsd",
      "1.0001",
      provenance("usdtPerUsd", "coingecko", COINGECKO_MARKETPLACE_TTL_MS),
      NOW,
    ),
    "1.0001",
  );
  assert.equal(
    carryMarketplaceLeg(
      "usdtPerUsd",
      "1.0001",
      provenance("usdtPerUsd", "coingecko", COINGECKO_MARKETPLACE_TTL_MS + 1),
      NOW,
    ),
    null,
  );
});

test("Frankfurter native/USD legs expire on their six hour provenance", () => {
  assert.equal(
    carryMarketplaceLeg(
      "gbpUsd",
      "1.31",
      provenance("gbpUsd", "frankfurter", FRANKFURTER_MARKETPLACE_TTL_MS),
      NOW,
    ),
    "1.31",
  );
  assert.equal(
    carryMarketplaceLeg(
      "gbpUsd",
      "1.31",
      provenance("gbpUsd", "frankfurter", FRANKFURTER_MARKETPLACE_TTL_MS + 1),
      NOW,
    ),
    null,
  );
});

test("wrong provider cannot refresh another provider's leg", () => {
  assert.equal(
    carryMarketplaceLeg(
      "usdtPerUsd",
      "1",
      provenance("usdtPerUsd", "frankfurter", 1),
      NOW,
    ),
    null,
  );
  assert.equal(
    carryMarketplaceLeg(
      "eurUsd",
      "1.1",
      provenance("eurUsd", "coingecko", 1),
      NOW,
    ),
    null,
  );
});

test("missing malformed or future provenance fails closed", () => {
  assert.equal(carryMarketplaceLeg("audUsd", "0.66", null, NOW), null);
  assert.equal(
    carryMarketplaceLeg(
      "audUsd",
      "0.66",
      { audUsd: { source: "frankfurter", capturedAt: "not-a-date" } },
      NOW,
    ),
    null,
  );
  assert.equal(
    carryMarketplaceLeg(
      "audUsd",
      "0.66",
      {
        audUsd: {
          source: "frankfurter",
          capturedAt: new Date(NOW + 1).toISOString(),
        },
      },
      NOW,
    ),
    null,
  );
});
