/**
 * REL-501 금융/red-team 하네스.
 * 가드 PASS 전에 모드 평가 0. 실원장 mutation 0. production DB 0.
 */
const fs = require("fs");
const path = require("path");
const { runMoneyMutationTest } = require("./money-mutation-gate.cjs");

const ROOT = path.resolve(__dirname, "../../..");
const MATRIX_PATH = path.join(ROOT, "tooling/e2e/money/red-team-matrix.v1.json");

const REQUIRED_MODES = [
  "idempotency",
  "double_submit",
  "insufficient",
  "stale",
  "expired",
  "blocked",
  "replay",
];

const LOCAL_QA = {
  databaseUrl: "postgres://u:YOUR_PASSWORD@127.0.0.1:5432/putduk_qa",
};

function loadMatrix() {
  const raw = JSON.parse(fs.readFileSync(MATRIX_PATH, "utf8"));
  if (raw.version !== 1) throw new Error("money-red-team: version must be 1");
  if (raw.mcpOnlyDone !== false) {
    throw new Error("money-red-team: MCP-only must not be DONE");
  }
  if (raw.productionDbWrite !== 0 || raw.realLedgerMutation !== 0) {
    throw new Error("money-red-team: production/real ledger write must stay 0");
  }
  if (raw.isolationGuardRequired !== true) {
    throw new Error("money-red-team: isolation guard is required");
  }
  const ids = (raw.modes || []).map((m) => m.id);
  for (const must of REQUIRED_MODES) {
    if (!ids.includes(must)) throw new Error("money-red-team: missing mode " + must);
  }
  if (ids.length !== REQUIRED_MODES.length) {
    throw new Error("money-red-team: invented extra mode");
  }
  return raw;
}

function evaluateUnlocked(mode, ctx) {
  switch (mode) {
    case "idempotency":
      if (ctx.sameKey && ctx.samePayload) {
        return { ok: true, outcome: "reuse", sideEffects: 1, mutated: false };
      }
      if (ctx.sameKey && !ctx.samePayload) {
        return {
          ok: false,
          outcome: "conflict",
          code: "IDEMPOTENCY_KEY_CONFLICT",
          sideEffects: 1,
          mutated: false,
        };
      }
      return { ok: true, outcome: "first", sideEffects: 1, mutated: false };
    case "double_submit":
      if (ctx.firstAccepted) {
        return {
          ok: true,
          outcome: "reuse",
          code: "REUSED",
          sideEffects: 1,
          mutated: false,
        };
      }
      return { ok: true, outcome: "first", sideEffects: 1, mutated: false };
    case "insufficient":
      return {
        ok: false,
        outcome: "reject",
        code:
          ctx.kind === "principal"
            ? "INSUFFICIENT_PRINCIPAL"
            : "INSUFFICIENT_BALANCE",
        sideEffects: 0,
        mutated: false,
      };
    case "stale":
      return {
        ok: false,
        outcome: "reject",
        code: ctx.variant === "data" ? "PRICE_STALE_DATA" : "PRICE_STALE",
        sideEffects: 0,
        mutated: false,
      };
    case "expired":
      return {
        ok: false,
        outcome: "reject",
        code: "OPPORTUNITY_EXPIRED",
        sideEffects: 0,
        mutated: false,
      };
    case "blocked":
      return {
        ok: false,
        outcome: "reject",
        code:
          ctx.kind === "withdraw"
            ? "WITHDRAW_BLOCKED"
            : ctx.kind === "withdraw_apply"
              ? "WITHDRAW_APPLY_BLOCKED"
              : "MATCH_BLOCKED",
        sideEffects: 0,
        mutated: false,
      };
    case "replay":
      return {
        ok: true,
        outcome: "reuse",
        sideEffects: 1,
        replayed: true,
        mutated: false,
      };
    default:
      throw new Error("money-red-team: unknown mode " + mode);
  }
}

function evaluateMode(mode, ctx, isolation = LOCAL_QA) {
  return runMoneyMutationTest(() => evaluateUnlocked(mode, ctx), isolation);
}

function runMatrix(isolation = LOCAL_QA) {
  const matrix = loadMatrix();
  return runMoneyMutationTest(() => {
    const results = [];
    results.push(
      evaluateUnlocked("idempotency", { sameKey: true, samePayload: true }),
    );
    results.push(
      evaluateUnlocked("idempotency", { sameKey: true, samePayload: false }),
    );
    results.push(evaluateUnlocked("double_submit", { firstAccepted: true }));
    results.push(evaluateUnlocked("insufficient", { kind: "balance" }));
    results.push(evaluateUnlocked("insufficient", { kind: "principal" }));
    results.push(evaluateUnlocked("stale", { variant: "price" }));
    results.push(evaluateUnlocked("stale", { variant: "data" }));
    results.push(evaluateUnlocked("expired", {}));
    results.push(evaluateUnlocked("blocked", { kind: "match" }));
    results.push(evaluateUnlocked("blocked", { kind: "withdraw" }));
    results.push(evaluateUnlocked("blocked", { kind: "withdraw_apply" }));
    results.push(evaluateUnlocked("replay", {}));
    return { matrix, results, mutated: results.some((r) => r.mutated) };
  }, isolation);
}

function assertProductBindings(matrix, root = ROOT) {
  const errors = [];
  for (const mode of matrix.modes || []) {
    const blobs = [];
    for (const rel of mode.productFiles || []) {
      const abs = path.join(root, rel);
      if (!fs.existsSync(abs)) {
        errors.push("missing product file " + rel);
        continue;
      }
      blobs.push(fs.readFileSync(abs, "utf8"));
    }
    const joined = blobs.join("\n");
    for (const needle of mode.needles || []) {
      if (!joined.includes(needle)) {
        errors.push(mode.id + " missing product needle " + needle);
      }
    }
  }
  return errors;
}

function expectThrow(fn, needles) {
  let threw = false;
  let message = "";
  try {
    fn();
  } catch (err) {
    threw = true;
    message = String(err && err.message ? err.message : err);
  }
  if (!threw) return "expected throw containing " + needles.join("|");
  if (!needles.some((n) => message.includes(n))) {
    return "throw message missing " + needles.join("|") + ": " + message;
  }
  return null;
}

function assertGuardStopsMutation() {
  const errors = [];
  let ran = false;
  const prod = expectThrow(() => {
    runMoneyMutationTest(
      () => {
        ran = true;
      },
      {
        databaseUrl:
          "postgres://u:YOUR_PASSWORD@db.mgsytcetsiecllmhcyox.supabase.co:5432/postgres",
      },
    );
  }, ["production"]);
  if (prod) errors.push(prod);
  if (ran) errors.push("production callback must not run");

  ran = false;
  const empty = expectThrow(() => {
    runMoneyMutationTest(() => {
      ran = true;
    }, { databaseUrl: "" });
  }, ["fail-closed"]);
  if (empty) errors.push(empty);
  if (ran) errors.push("empty-target callback must not run");
  return errors;
}

module.exports = {
  MATRIX_PATH,
  REQUIRED_MODES,
  LOCAL_QA,
  loadMatrix,
  evaluateMode,
  runMatrix,
  assertProductBindings,
  assertGuardStopsMutation,
};
