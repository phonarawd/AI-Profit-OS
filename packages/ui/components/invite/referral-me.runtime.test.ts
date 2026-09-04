import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyReferralHttp,
  parseReferralMe,
} from "./referral-me-state.ts";

describe("authoritative own referral code", () => {
  it("uses referralCode even when edges are empty", () => {
    const parsed = parseReferralMe({
      enabled: true,
      referralCode: "QA120INVITE",
      edges: [],
    });
    assert.equal(parsed?.view, "ready");
    assert.equal(parsed?.view === "ready" ? parsed.data.referralCode : "", "QA120INVITE");
    assert.equal(parsed?.view === "ready" ? parsed.data.joined : undefined, 0);
  });
  it("does not take an outgoing edge code as own code", () => {
    assert.equal(
      parseReferralMe({
        enabled: true,
        edges: [{ code: "EDGEONLY1" }],
      }),
      null,
    );
  });
  it("rejects missing or blank referralCode", () => {
    assert.equal(parseReferralMe({ enabled: true, referralCode: "" }), null);
    assert.equal(parseReferralMe({ enabled: true, referralCode: null }), null);
    assert.equal(parseReferralMe({ enabled: true }), null);
  });
  it("keeps program-disabled distinct from missing code", () => {
    assert.deepEqual(parseReferralMe({ enabled: false, edges: [] }), {
      view: "disabled",
    });
  });
  it("rejects banned/deleted/missing status", () => {
    assert.equal(
      parseReferralMe({
        enabled: true,
        referralCode: "QA120INVITE",
        referralCodeStatus: "banned",
      }),
      null,
    );
    assert.equal(
      parseReferralMe({
        enabled: true,
        referralCode: "QA120INVITE",
        referralCodeStatus: "missing",
      }),
      null,
    );
  });
  it("classifies 401/403 as unauthorized", () => {
    assert.equal(classifyReferralHttp(401), "unauthorized");
    assert.equal(classifyReferralHttp(403), "unauthorized");
    assert.equal(classifyReferralHttp(500), "unavailable");
  });
});
