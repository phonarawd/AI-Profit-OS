import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decidePostAuthEntry } from "./entry.ts";
import { continueAfterAuth } from "./fetch.ts";

describe("decidePostAuthEntry", () => {
  it("sends incomplete profile to complete-profile", () => {
    assert.deepEqual(
      decidePostAuthEntry({ onboardingStage: "B_incomplete" }, null),
      { destination: "/auth/complete-profile" },
    );
  });

  it("sends complete profile without product onboarding to /onboarding", () => {
    assert.deepEqual(
      decidePostAuthEntry({ onboardingStage: "B_complete" }, null),
      { destination: "/onboarding", currentStep: 1 },
    );
  });

  it("resumes the stored step", () => {
    assert.deepEqual(
      decidePostAuthEntry(
        { onboardingStage: "B_complete" },
        { completedAt: null, currentStep: 4 },
      ),
      { destination: "/onboarding", currentStep: 4 },
    );
  });

  it("sends completed product onboarding home", () => {
    assert.deepEqual(
      decidePostAuthEntry(
        { onboardingStage: "B_complete" },
        { completedAt: "2026-09-06T00:00:00.000Z", currentStep: 7 },
      ),
      { destination: "/" },
    );
  });
});

describe("continueAfterAuth", () => {
  it("does not fetch when profile is incomplete", async () => {
    const path = await continueAfterAuth("B_incomplete", {
      apiBase: "http://127.0.0.1:9",
    });
    assert.equal(path, "/auth/complete-profile");
  });

  it("does not invent completed when onboarding fetch fails", async () => {
    const path = await continueAfterAuth("B_complete", {
      apiBase: "http://127.0.0.1:9",
    });
    assert.equal(path, "/onboarding");
  });
});
