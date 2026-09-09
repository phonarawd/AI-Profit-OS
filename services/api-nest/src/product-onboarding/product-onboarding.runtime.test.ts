import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseProgressPatch } from "./product-onboarding.parse.ts";
import {
  ProductOnboardingConflictError,
  ProductOnboardingUnavailableError,
  completeOnboardingForUser,
  readOnboardingForUser,
  writeProgressForUser,
  type OnboardingRow,
} from "./product-onboarding.store.ts";

const USER = "11111111-1111-1111-1111-111111111111";

function row(over: Partial<OnboardingRow> = {}): OnboardingRow {
  return {
    user_id: USER,
    version: 1,
    current_step: 1,
    state: "in_progress",
    preferences: { largeType: false, easyExplain: false },
    completed_at: null,
    updated_at: new Date("2026-09-06T00:00:00.000Z"),
    ...over,
  };
}

describe("product-onboarding parse", () => {
  it("accepts step or preferences and ignores event", () => {
    assert.deepEqual(parseProgressPatch({ currentStep: 3, event: "step" }), {
      currentStep: 3,
    });
    assert.deepEqual(
      parseProgressPatch({
        preferences: { largeType: true, easyExplain: false },
      }),
      { preferences: { largeType: true, easyExplain: false } },
    );
  });

  it("rejects skip-shaped and unknown keys", () => {
    assert.deepEqual(parseProgressPatch({ currentStep: 0 }), {
      error: "PRODUCT_ONBOARDING_MALFORMED",
    });
    assert.deepEqual(parseProgressPatch({ currentStep: 3, userId: USER }), {
      error: "PRODUCT_ONBOARDING_MALFORMED",
    });
  });
});

describe("product-onboarding store", () => {
  it("does not invent completed when SELECT throws", async () => {
    await assert.rejects(
      () =>
        readOnboardingForUser(
          { query: async () => { throw new Error("ECONNREFUSED"); } },
          USER,
        ),
      (err: unknown) => err instanceof ProductOnboardingUnavailableError,
    );
  });

  it("rejects skipping more than one step", async () => {
    await assert.rejects(
      () =>
        writeProgressForUser(
          {
            query: async (sql: string) => {
              if (String(sql).includes("INSERT")) return { rows: [], rowCount: 0 };
              return { rows: [row()], rowCount: 1 };
            },
          },
          USER,
          { currentStep: 4 },
        ),
      (err: unknown) => err instanceof ProductOnboardingConflictError,
    );
  });

  it("complete is idempotent", async () => {
    const done = row({
      current_step: 7,
      state: "completed",
      completed_at: new Date("2026-09-06T01:00:00.000Z"),
    });
    const got = await completeOnboardingForUser(
      {
        query: async (sql: string) => {
          if (String(sql).includes("INSERT")) return { rows: [], rowCount: 0 };
          return { rows: [done], rowCount: 1 };
        },
      },
      USER,
    );
    assert.equal(got.state, "completed");
    assert.equal(got.currentStep, 7);
    assert.equal(got.lesson.capital.requiredCapitalUsdt, "1000.00");
    assert.equal(got.lesson.waterfall.expectedProfitUsdt, "284.00");
    assert.equal(got.lesson.settlement.success.settledProfitUsdt, "271.00");
  });
});
