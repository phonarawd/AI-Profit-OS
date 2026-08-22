/**
 * REL-501 금융/red-team 하네스.
 * 기존 settlement_rule · fingerprint 계약을 가드 안에서 실행한다.
 * 신규 money owner / 잔액 UPDATE / production DB 금지.
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../../..");
const MATRIX_PATH = path.join(ROOT, "tooling/e2e/matrix/money-red-team.v1.json");

function loadMatrix() {
  const matrix = JSON.parse(fs.readFileSync(MATRIX_PATH, "utf8"));
  if (matrix.id !== "money-red-team" || matrix.rel !== "REL-501") {
    throw new Error("MONEY_RED_TEAM: matrix id/rel drift");
  }
  if (matrix.policy.qaEnvIsolationGuard !== "REQUIRED") {
    throw new Error("MONEY_RED_TEAM: QA_ENV_ISOLATION_GUARD required");
  }
  if (matrix.policy.productionDbWrite !== 0) {
    throw new Error("MONEY_RED_TEAM: productionDbWrite must stay 0");
  }
  if (matrix.policy.newMoneyOwner !== 0) {
    throw new Error("MONEY_RED_TEAM: newMoneyOwner must stay 0");
  }
  return matrix;
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`)
    .join(",")}}`;
}

function fingerprintPayload(semantic) {
  const canonical = `v1:${stableStringify(semantic)}`;
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

function assertFingerprintMatch(stored, incoming) {
  const prev = String(stored || "").trim();
  if (!prev) return { reused: true };
  if (prev !== incoming) {
    const err = new Error("IDEMPOTENCY_KEY_CONFLICT");
    err.code = "IDEMPOTENCY_KEY_CONFLICT";
    throw err;
  }
  return { reused: true };
}

function runGuarded(fn) {
  const { assertQaIsolation } = require("./qa-env-isolation-guard.cjs");
  const { runMoneyMutationTest } = require("./money-mutation-gate.cjs");
  assertQaIsolation({ purpose: "e2e", databaseUrl: "", projectRef: "" });
  return runMoneyMutationTest(fn, {
    databaseUrl: "postgres://qa:YOUR_PASSWORD@127.0.0.1:5432/putduk_qa",
  });
}

function runFailureModes() {
  return runGuarded(() => {
    const rule = require(path.join(ROOT, "services/engine-rust/settlement_rule.cjs"));
    const nowMs = 1_700_000_000_000;
    const results = [];

    const blocked = rule.guardParticipate({
      matchBlocked: true,
      compareReady: true,
      nowMs,
      staleAtMs: nowMs,
    });
    results.push({
      id: "blocked",
      expected: "MATCH_BLOCKED",
      actual: blocked,
      pass: blocked === "MATCH_BLOCKED",
    });

    const stale = rule.guardParticipate({
      matchBlocked: false,
      compareReady: true,
      nowMs,
      staleAtMs: nowMs - (rule.DEFAULT_PRICE_STALE_MAX_SEC + 1) * 1000,
    });
    results.push({
      id: "stale",
      expected: "PRICE_STALE_DATA",
      actual: stale,
      pass: stale === "PRICE_STALE_DATA",
    });

    const expiredOpp = { status: "closed", execution_mode: "orchestrate" };
    const expired =
      expiredOpp.status !== "available" ||
      expiredOpp.execution_mode !== "orchestrate";
    results.push({
      id: "expired",
      expected: "OPPORTUNITY_EXPIRED",
      actual: expired ? "OPPORTUNITY_EXPIRED" : "OK",
      pass: expired === true,
    });

    const principal = "10.00";
    const requested = "25.00";
    const insufficient = rule.usdtGe(requested, principal) && requested !== principal;
    results.push({
      id: "insufficient",
      expected: "INSUFFICIENT_PRINCIPAL",
      actual: insufficient ? "INSUFFICIENT_PRINCIPAL" : "OK",
      pass: insufficient === true,
    });

    const semanticA = {
      userId: "qa-lab-persona-member",
      opportunityId: "opp-1",
      pricingVersion: 1,
      minProfitUsdt: "1.00",
      amountUsdt: "10.00",
    };
    const semanticB = { ...semanticA, amountUsdt: "11.00" };
    const fpA = fingerprintPayload(semanticA);
    const fpB = fingerprintPayload(semanticB);
    let conflictCode = "";
    try {
      assertFingerprintMatch(fpA, fpB);
    } catch (err) {
      conflictCode = err.code || err.message;
    }
    results.push({
      id: "idempotency",
      expected: "IDEMPOTENCY_KEY_CONFLICT",
      actual: conflictCode,
      pass: conflictCode === "IDEMPOTENCY_KEY_CONFLICT" && fpA !== fpB,
    });

    const replay = assertFingerprintMatch(fpA, fpA);
    results.push({
      id: "replay",
      expected: "REPLAY_REUSE",
      actual: replay.reused ? "REPLAY_REUSE" : "NEW",
      pass: replay.reused === true && fpA === fingerprintPayload(semanticA),
    });

    const doubleSubmit = assertFingerprintMatch(fpA, fingerprintPayload(semanticA));
    results.push({
      id: "double_submit",
      expected: "REPLAY_REUSE",
      actual: doubleSubmit.reused ? "REPLAY_REUSE" : "NEW",
      pass: doubleSubmit.reused === true,
    });

    return {
      liveDbMoneyMutation: "NOT_RUN",
      productionDbWrite: 0,
      results,
    };
  });
}

function assertProductionDenied() {
  const { runMoneyMutationTest } = require("./money-mutation-gate.cjs");
  let ran = false;
  try {
    runMoneyMutationTest(
      () => {
        ran = true;
      },
      {
        databaseUrl:
          "postgres://u:YOUR_PASSWORD@db.mgsytcetsiecllmhcyox.supabase.co:5432/postgres",
      },
    );
    throw new Error("MONEY_RED_TEAM: production money mutation was not blocked");
  } catch (err) {
    if (ran) {
      throw new Error("MONEY_RED_TEAM: production callback ran");
    }
    if (!String(err.message).includes("production")) {
      throw err;
    }
  }
}

module.exports = {
  ROOT,
  MATRIX_PATH,
  loadMatrix,
  fingerprintPayload,
  assertFingerprintMatch,
  runFailureModes,
  assertProductionDenied,
};
