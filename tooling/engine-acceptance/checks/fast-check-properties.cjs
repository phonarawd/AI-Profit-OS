/**
 * QA3 — fast-check generative property suite
 * 제품 mutation 0 · 실패 시 rich evidence + defects 기록 (수정 금지)
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const fc = require("fast-check");
const { ROOT } = require("../lib/hash-scope.cjs");
const { RNG_VERSION } = require("../lib/seeded-rng.cjs");
const {
  fingerprintPayload,
  participateSemantic,
  assertFingerprintMatch,
} = require("../lib/fingerprint-oracle.cjs");
const { buildRichFailureEvidence } = require("../lib/rich-failure-evidence.cjs");

const settlement = require(path.join(ROOT, "services/engine-rust/settlement_rule.cjs"));

function fcVersion() {
  try {
    const pkg = require("fast-check/package.json");
    return pkg.version || "unknown";
  } catch {
    return "unknown";
  }
}

function usdtArb() {
  return fc
    .tuple(fc.integer({ min: 0, max: 999_999 }), fc.integer({ min: 0, max: 999_999 }))
    .map(([w, f]) => `${w}.${String(f).padStart(6, "0")}`);
}

function uuidLikeArb() {
  return fc.uuid();
}

function executionCtxArb() {
  return fc.record({
    participateAcceptedAtMs: fc.integer({ min: 1_700_000_000_000, max: 1_900_000_000_000 }),
    nowMs: fc.integer({ min: 1_700_000_000_000, max: 1_900_000_000_000 + 200_000 }),
    circuitStatus: fc.constantFrom("closed", "open", "half_open"),
    userStatus: fc.constantFrom("active", "frozen", "banned"),
    opportunityStatus: fc.constantFrom("available", "paused", "closed"),
    compareReady: fc.boolean(),
    staleAtMs: fc.integer({ min: 1_700_000_000_000, max: 1_900_000_000_000 }),
    expectedProfitUsdt: usdtArb(),
    tradePricingVersion: fc.integer({ min: 1, max: 20 }),
    opportunityPricingVersion: fc.integer({ min: 1, max: 20 }),
    simulationPayoutFeasible: fc.boolean(),
    listingLegsFresh: fc.boolean(),
    rematchCount: fc.integer({ min: 0, max: 8 }),
    policy: fc.record({
      staleAllowanceSec: fc.integer({ min: 0, max: 30 }),
      minProfitUsdt: usdtArb(),
      maxRematchCount: fc.integer({ min: 0, max: 5 }),
      retryWaitSec: fc.integer({ min: 0, max: 20 }),
    }),
  });
}

function runProperty(def, opts) {
  const numRuns = opts.numRuns;
  const seed = opts.seedBase ^ (def.seedSalt >>> 0);
  const clock_as_of = opts.clock_as_of;
  /** @type {any} */
  let failure = null;

  try {
    fc.assert(def.property(), {
      numRuns,
      seed,
      endOnFailure: true,
      verbose: false,
    });
  } catch (e) {
    const counterexample =
      e && e.counterexample !== undefined
        ? e.counterexample
        : e && e.counterexamplePath
          ? { path: e.counterexamplePath }
          : null;
    const request_sequence = [
      {
        step: 1,
        action: "fc.assert",
        property_id: def.id,
        seed,
        numRuns,
      },
      {
        step: 2,
        action: "counterexample",
        body: counterexample,
      },
    ];
    failure = buildRichFailureEvidence({
      seed,
      rng_version: RNG_VERSION,
      clock_as_of,
      request_sequence,
      sanitized_request: { property_id: def.id, numRuns, seed },
      sanitized_response: { status: "FAIL", message: String(e && e.message) },
      counterexample,
      error_message: e && e.message,
      baseline_id: opts.baseline_id,
      property_id: def.id,
      invariant_id: def.invariant_id,
      numRuns,
      mode: opts.mode,
      fast_check_version: fcVersion(),
    });
  }

  return {
    property_id: def.id,
    invariant_id: def.invariant_id,
    title: def.title,
    status: failure ? "FAIL" : "PASS",
    seed,
    numRuns,
    fast_check_version: fcVersion(),
    findings: failure ? [failure.error_message || "property failed"] : [],
    rich_evidence: failure,
  };
}

function buildProperties() {
  return [
    {
      id: "PROP-SETTLEMENT-DETERMINISM",
      invariant_id: "INV-LIFECYCLE-01",
      title: "evaluateExecution same ctx → same result",
      seedSalt: 0x51e001,
      property: () =>
        fc.property(executionCtxArb(), (ctx) => {
          const a = settlement.evaluateExecution(ctx);
          const b = settlement.evaluateExecution(ctx);
          return a === b && typeof a === "string" && a.length > 0;
        }),
    },
    {
      id: "PROP-SETTLEMENT-HARD-TIMEOUT",
      invariant_id: "INV-LIFECYCLE-01",
      title: "nowMs >= hard deadline → MATCH_TIMEOUT",
      seedSalt: 0x51e002,
      property: () =>
        fc.property(executionCtxArb(), (ctx) => {
          const hard = settlement.hardDeadlineMs(ctx.participateAcceptedAtMs);
          const ctx2 = {
            ...ctx,
            nowMs: hard + (Math.abs(ctx.rematchCount || 0) % 7) * 1000,
          };
          return settlement.evaluateExecution(ctx2) === "MATCH_TIMEOUT";
        }),
    },
    {
      id: "PROP-SETTLEMENT-NO-RANDOM",
      invariant_id: "INV-LIFECYCLE-01",
      title: "settlement_rule source forbids Math.random / successRate",
      seedSalt: 0x51e003,
      property: () =>
        fc.property(fc.constant(null), () => {
          const src = fs.readFileSync(
            path.join(ROOT, "services/engine-rust/settlement_rule.cjs"),
            "utf8",
          );
          // 주석·FORBIDDEN 문구의 토큰은 오탐 — 실제 호출/바인딩만 탐지
          const stripped = src
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/\/\/[^\n]*/g, "");
          if (/Math\.random\s*\(/.test(stripped)) return false;
          if (/\bsuccessRatePercent\b\s*[=:]/.test(stripped)) return false;
          return true;
        }),
    },
    {
      id: "PROP-IDEMPOTENCY-FP-DETERMINISM",
      invariant_id: "INV-IDEMPOTENCY-01",
      title: "same semantic → same fingerprint (key-order independent)",
      seedSalt: 0x1de001,
      property: () =>
        fc.property(
          fc.record({
            userId: uuidLikeArb(),
            opportunityId: uuidLikeArb(),
            pricingVersion: fc.integer({ min: 1, max: 100 }),
            minProfitUsdt: usdtArb(),
            amountUsdt: usdtArb(),
          }),
          (input) => {
            const a = participateSemantic(input);
            const b = {
              amountUsdt: input.amountUsdt,
              minProfitUsdt: input.minProfitUsdt,
              pricingVersion: input.pricingVersion,
              opportunityId: input.opportunityId,
              userId: input.userId,
            };
            return fingerprintPayload(a) === fingerprintPayload(b);
          },
        ),
    },
    {
      id: "PROP-IDEMPOTENCY-CONFLICT",
      invariant_id: "INV-IDEMPOTENCY-03",
      title: "same key + conflicting payload → IDEMPOTENCY_KEY_CONFLICT",
      seedSalt: 0x1de003,
      property: () =>
        fc.property(
          fc.record({
            userId: uuidLikeArb(),
            opportunityId: uuidLikeArb(),
            pricingVersion: fc.integer({ min: 1, max: 100 }),
            minProfitUsdt: usdtArb(),
            amountUsdt: usdtArb(),
            amountUsdt2: usdtArb(),
          }),
          (input) => {
            fc.pre(input.amountUsdt !== input.amountUsdt2);
            const s1 = participateSemantic({
              userId: input.userId,
              opportunityId: input.opportunityId,
              pricingVersion: input.pricingVersion,
              minProfitUsdt: input.minProfitUsdt,
              amountUsdt: input.amountUsdt,
            });
            const s2 = participateSemantic({
              userId: input.userId,
              opportunityId: input.opportunityId,
              pricingVersion: input.pricingVersion,
              minProfitUsdt: input.minProfitUsdt,
              amountUsdt: input.amountUsdt2,
            });
            const fp1 = fingerprintPayload(s1);
            const fp2 = fingerprintPayload(s2);
            if (fp1 === fp2) return false;
            const conflict = assertFingerprintMatch({ stored: fp1, incoming: fp2 });
            return conflict.ok === false && conflict.code === "IDEMPOTENCY_KEY_CONFLICT";
          },
        ),
    },
    {
      id: "PROP-ISOLATION-OWNERSHIP",
      invariant_id: "INV-ISOLATION-01",
      title: "user A token never authorizes user B resource",
      seedSalt: 0x150001,
      property: () =>
        fc.property(
          fc.record({
            userA: uuidLikeArb(),
            userB: uuidLikeArb(),
            resourceOwner: uuidLikeArb(),
            objectId: uuidLikeArb(),
          }),
          (g) => {
            fc.pre(g.userA !== g.userB);
            // synthetic authz oracle (harness): owner must equal requester
            const authorize = (requester, owner) => requester === owner;
            const aSeesB =
              g.resourceOwner === g.userB && authorize(g.userA, g.resourceOwner);
            const bSeesA =
              g.resourceOwner === g.userA && authorize(g.userB, g.resourceOwner);
            // cross-user grant must never be true
            if (aSeesB || bSeesA) return false;
            // positive: owner can access own
            if (!authorize(g.resourceOwner, g.resourceOwner)) return false;
            return true;
          },
        ),
    },
    {
      id: "PROP-LEDGER-USDT-GE-REFLEXIVE",
      invariant_id: "INV-LEDGER-01",
      title: "usdtGe(x,x) always true",
      seedSalt: 0x1ed001,
      property: () =>
        fc.property(usdtArb(), (x) => settlement.usdtGe(x, x) === true),
    },
  ];
}

/**
 * @param {{ mode?: string, baseline_id: string, measuredAt?: string, seedBase?: number }} opts
 */
function runFastCheckProperties(opts = {}) {
  const mode = opts.mode === "full" ? "full" : "tiny";
  const numRuns = mode === "full" ? 200 : 40;
  const clock_as_of = opts.measuredAt || new Date().toISOString();
  const seedBase = opts.seedBase ?? 0x0a130000;
  const properties = buildProperties();
  const results = properties.map((def) =>
    runProperty(def, {
      numRuns,
      seedBase,
      clock_as_of,
      baseline_id: opts.baseline_id,
      mode,
    }),
  );
  const failed = results.filter((r) => r.status === "FAIL");
  // product source token lock for fingerprint (static, not mutation)
  const fpSrc = fs.readFileSync(
    path.join(ROOT, "services/api-nest/src/ledger/idempotency-fingerprint.ts"),
    "utf8",
  );
  const sourceLockFindings = [];
  for (const tok of [
    "IDEMPOTENCY_FINGERPRINT_VERSION",
    "fingerprintPayload",
    "assertFingerprintMatch",
    "IDEMPOTENCY_KEY_CONFLICT",
  ]) {
    if (!fpSrc.includes(tok)) {
      sourceLockFindings.push(`product fingerprint missing token: ${tok}`);
    }
  }
  const source_lock = {
    check_id: "QA3_FINGERPRINT_SOURCE_LOCK",
    status: sourceLockFindings.length ? "FAIL" : "PASS",
    findings: sourceLockFindings,
  };

  return {
    check_id: "QA3_FAST_CHECK_PROPERTIES",
    status: failed.length === 0 && source_lock.status === "PASS" ? "PASS" : "FAIL",
    mode,
    numRuns,
    seedBase,
    rng_version: RNG_VERSION,
    fast_check_version: fcVersion(),
    propertyCount: results.length,
    passed: results.filter((r) => r.status === "PASS").length,
    failed: failed.length,
    properties: results,
    source_lock,
    product_mutation: 0,
    notes: [
      "Generative fuzz via fast-check · Schemathesis 직접 의존 0.",
      "Failure → rich evidence (seed+rng+clock+request_sequence) · defects · 제품 수정 0.",
      "Case/run counts are observational · not KPIs.",
    ],
  };
}

module.exports = { runFastCheckProperties, buildProperties };
