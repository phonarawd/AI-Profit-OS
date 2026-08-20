/**
 * B-LOOP-002 인프로세스 Core Loop E2E.
 * 라이브 settlement_rule + 서비스와 동일한 저널 모양 + consumer 상태.
 * 새 pricing/FX/ledger owner 없음. 브라우저/원격 DB 쓰기 없음.
 */
"use strict";

const path = require("node:path");

const root = path.resolve(__dirname, "../../..");
const rule = require(path.join(root, "services/engine-rust/settlement_rule.cjs"));

const TERMINAL = new Set(["success", "safe_stop", "cancelled", "failed"]);
const USDT_DEC = /^-?[0-9]+(\.[0-9]+)?$/;
const SAFE_STOP_CODES = [
  "PRICE_MOVED",
  "BELOW_MIN_PROFIT",
  "MATCH_TIMEOUT",
  "CIRCUIT_OPEN",
];

function num(s) {
  return Number(s);
}

function add(a, b) {
  return String(num(a) + num(b));
}

function sub(a, b) {
  return String(num(a) - num(b));
}

function userLiability(world) {
  return add(
    add(world.buckets.principal, world.buckets.locked),
    add(world.buckets.profit, world.buckets.practice),
  );
}

function consumerState(trade) {
  if (!trade) return null;
  const settled =
    trade.status === "success" &&
    typeof trade.settledProfitUsdt === "string" &&
    USDT_DEC.test(trade.settledProfitUsdt);
  if (settled) return "Settled";
  switch (trade.status) {
    case "running":
      return "MatchingInProgress";
    case "requeue":
      return "MatchingRetrying";
    case "safe_stop":
      return "StoppedSafely";
    case "cancelled":
      return "Cancelled";
    case "failed":
      return "Failed";
    default:
      return null;
  }
}

function createWorld(start) {
  const world = {
    buckets: {
      principal: start.principal ?? "100",
      locked: "0",
      profit: start.profit ?? "0",
      practice: start.practice ?? "0",
    },
    system: {
      opportunityPool: start.opportunityPool ?? "1000000",
      feeRevenue: "0",
    },
    journals: [],
    journalByKey: new Map(),
    trade: null,
  };
  world.openingLiability = userLiability(world);
  return world;
}

function applyLine(world, line) {
  const amt = line.amountUsdt;
  if (line.account.systemCode === "OPPORTUNITY_POOL") {
    world.system.opportunityPool =
      line.direction === "debit"
        ? sub(world.system.opportunityPool, amt)
        : add(world.system.opportunityPool, amt);
    return;
  }
  if (line.account.systemCode === "FEE_REVENUE") {
    world.system.feeRevenue =
      line.direction === "credit"
        ? add(world.system.feeRevenue, amt)
        : sub(world.system.feeRevenue, amt);
    return;
  }
  const bucket = line.account.bucket;
  if (!Object.prototype.hasOwnProperty.call(world.buckets, bucket)) {
    throw new Error(`unknown bucket ${bucket}`);
  }
  world.buckets[bucket] =
    line.direction === "debit"
      ? sub(world.buckets[bucket], amt)
      : add(world.buckets[bucket], amt);
}

function postJournal(world, input) {
  const existing = world.journalByKey.get(input.idempotencyKey);
  if (existing) return { journal: existing, created: false };
  const journal = {
    idempotencyKey: input.idempotencyKey,
    journalType: input.journalType,
    lines: input.lines,
  };
  for (const line of input.lines) applyLine(world, line);
  world.journals.push(journal);
  world.journalByKey.set(input.idempotencyKey, journal);
  return { journal, created: true };
}

function participate(world, input) {
  if (input.amountUsdt !== input.requiredCapitalUsdt) {
    return { ok: false, code: "VALIDATION_ERROR" };
  }
  if (num(world.buckets.principal) < num(input.amountUsdt)) {
    return { ok: false, code: "INSUFFICIENT_PRINCIPAL" };
  }
  const guard = rule.guardParticipate(input.guard);
  if (guard !== "OK") return { ok: false, code: guard };

  postJournal(world, {
    idempotencyKey: `participate_lock:${input.idempotencyKey}`,
    journalType: "participate_lock",
    lines: [
      {
        account: { userId: "u", bucket: "principal" },
        direction: "debit",
        amountUsdt: input.amountUsdt,
      },
      {
        account: { userId: "u", bucket: "locked" },
        direction: "credit",
        amountUsdt: input.amountUsdt,
      },
    ],
  });

  if (!world.trade) {
    world.trade = {
      id: input.tradeId || "11111111-1111-4111-8111-111111111111",
      status: "running",
      resultCode: undefined,
      settledProfitUsdt: undefined,
      rematchCount: 0,
      expectedProfitUsdt: input.expectedProfitUsdt,
      capitalUsdt: input.amountUsdt,
    };
  }
  return { ok: true, tradeId: world.trade.id, consumer: consumerState(world.trade) };
}

function finalizeMatchSuccess(world, expectedProfitUsdt) {
  if (world.trade.ledgerJournalId) {
    return { ok: true, noop: true, consumer: consumerState(world.trade) };
  }
  const capital = world.trade.capitalUsdt;
  const posted = postJournal(world, {
    idempotencyKey: `settlement:${world.trade.id}`,
    journalType: "settlement",
    lines: [
      {
        account: { userId: "u", bucket: "locked" },
        direction: "debit",
        amountUsdt: capital,
      },
      {
        account: { userId: "u", bucket: "principal" },
        direction: "credit",
        amountUsdt: capital,
      },
      {
        account: { systemCode: "OPPORTUNITY_POOL" },
        direction: "debit",
        amountUsdt: expectedProfitUsdt,
      },
      {
        account: { userId: "u", bucket: "profit" },
        direction: "credit",
        amountUsdt: expectedProfitUsdt,
      },
    ],
  });
  world.trade.status = "success";
  world.trade.resultCode = "MATCH_SUCCESS";
  world.trade.settledProfitUsdt = expectedProfitUsdt;
  world.trade.ledgerJournalId = posted.journal.idempotencyKey;
  return {
    ok: true,
    created: posted.created,
    consumer: consumerState(world.trade),
    resultCode: "MATCH_SUCCESS",
  };
}

function finalizeSafeStop(world, resultCode) {
  const capital = world.trade.capitalUsdt;
  if (num(capital) > 0 && !world.trade.ledgerJournalId) {
    postJournal(world, {
      idempotencyKey: `participate_unlock:${world.trade.id}`,
      journalType: "participate_unlock",
      lines: [
        {
          account: { userId: "u", bucket: "locked" },
          direction: "debit",
          amountUsdt: capital,
        },
        {
          account: { userId: "u", bucket: "principal" },
          direction: "credit",
          amountUsdt: capital,
        },
      ],
    });
  }
  world.trade.status = resultCode === "SYSTEM_FAILED" ? "failed" : "safe_stop";
  world.trade.resultCode = resultCode;
  return {
    ok: true,
    consumer: consumerState(world.trade),
    resultCode,
  };
}

function executeTick(world, ctx) {
  if (!world.trade) return { ok: false, code: "NOT_FOUND" };
  if (TERMINAL.has(world.trade.status)) {
    return { ok: true, noop: true, consumer: consumerState(world.trade) };
  }
  if (ctx.missingOpportunity === true) {
    return finalizeSafeStop(world, "SYSTEM_FAILED");
  }
  const resultCode = rule.evaluateExecution(ctx);
  if (resultCode === "MATCH_SUCCESS") {
    return finalizeMatchSuccess(world, String(ctx.expectedProfitUsdt));
  }
  if (resultCode === "REQUEUE") {
    world.trade.rematchCount =
      world.trade.status === "requeue"
        ? world.trade.rematchCount
        : world.trade.rematchCount + 1;
    world.trade.status = "requeue";
    world.trade.resultCode = "REQUEUE";
    return {
      ok: true,
      consumer: consumerState(world.trade),
      resultCode: "REQUEUE",
    };
  }
  return finalizeSafeStop(world, resultCode);
}

function freshGuard() {
  return {
    matchBlocked: false,
    compareReady: true,
    nowMs: 2000,
    staleAtMs: 1000,
    priceStaleMaxSec: 3,
  };
}

function participateReady(world, extra) {
  return participate(world, {
    amountUsdt: extra.amountUsdt ?? "100",
    requiredCapitalUsdt: extra.requiredCapitalUsdt ?? "100",
    expectedProfitUsdt: extra.expectedProfitUsdt ?? "10",
    idempotencyKey: extra.idempotencyKey ?? "idem-1",
    tradeId: extra.tradeId,
    guard: extra.guard ?? freshGuard(),
  });
}

function runAll() {
  const fails = [];
  const fail = (msg) => fails.push(msg);

  const successWorld = createWorld({});
  const accepted = participateReady(successWorld, {});
  if (!accepted.ok) fail(`success participate want OK got ${accepted.code}`);
  if (successWorld.buckets.principal !== "0" || successWorld.buckets.locked !== "100") {
    fail("participate_lock must move principal→locked");
  }
  if (userLiability(successWorld) !== successWorld.openingLiability) {
    fail("lock must not change user liability");
  }
  if (consumerState(successWorld.trade) !== "MatchingInProgress") {
    fail("accepted trade must be MatchingInProgress");
  }

  const successTick = executeTick(successWorld, {
    nowMs: 1_000_000,
    participateAcceptedAtMs: 1_000_000,
    circuitStatus: "closed",
    userStatus: "active",
    opportunityStatus: "available",
    compareReady: true,
    staleAtMs: 999_000,
    expectedProfitUsdt: "10",
    tradePricingVersion: 1,
    opportunityPricingVersion: 1,
    simulationPayoutFeasible: true,
    listingLegsFresh: true,
    rematchCount: 0,
    policy: {
      minProfitUsdt: "5",
      staleAllowanceSec: 3,
      maxRematchCount: 2,
      retryWaitSec: 4,
    },
    presentationDurationSec: 12,
  });
  if (successTick.resultCode !== "MATCH_SUCCESS") {
    fail(`success tick want MATCH_SUCCESS got ${successTick.resultCode}`);
  }
  if (successTick.consumer !== "Settled") {
    fail(`success consumer want Settled got ${successTick.consumer}`);
  }
  if (successWorld.buckets.principal !== "100" || successWorld.buckets.locked !== "0") {
    fail("MATCH_SUCCESS must return capital principal and clear locked");
  }
  if (successWorld.buckets.profit !== "10") {
    fail("MATCH_SUCCESS must credit profit from opportunity pool");
  }
  if (userLiability(successWorld) !== add(successWorld.openingLiability, "10")) {
    fail("success liability must rise only by settled profit");
  }
  if (!successWorld.journalByKey.has(`settlement:${successWorld.trade.id}`)) {
    fail("success must post journalType=settlement");
  }
  if (successWorld.journalByKey.has(`participate_unlock:${successWorld.trade.id}`)) {
    fail("success must not post participate_unlock");
  }

  const replay = executeTick(successWorld, { nowMs: 1_000_100 });
  if (!replay.noop) fail("terminal success tick must no-op");
  const settlementJournals = successWorld.journals.filter(
    (j) => j.journalType === "settlement",
  );
  if (settlementJournals.length !== 1) {
    fail(`double settlement forbidden, got ${settlementJournals.length}`);
  }
  if (successWorld.buckets.profit !== "10") {
    fail("replay must not credit profit twice");
  }

  const ghost = {
    status: "success",
    settledProfitUsdt: undefined,
  };
  if (consumerState(ghost) === "Settled") {
    fail("success without settledProfitUsdt must not be Settled");
  }

  const durA = rule.evaluateExecution({
    nowMs: 1_000_000,
    participateAcceptedAtMs: 1_000_000,
    circuitStatus: "closed",
    userStatus: "active",
    opportunityStatus: "available",
    compareReady: true,
    staleAtMs: 999_000,
    expectedProfitUsdt: "10",
    tradePricingVersion: 1,
    opportunityPricingVersion: 1,
    simulationPayoutFeasible: true,
    listingLegsFresh: true,
    rematchCount: 0,
    policy: {
      minProfitUsdt: "5",
      staleAllowanceSec: 3,
      maxRematchCount: 2,
      retryWaitSec: 4,
    },
    presentationDurationSec: 8,
  });
  const durB = rule.evaluateExecution({
    nowMs: 1_000_000,
    participateAcceptedAtMs: 1_000_000,
    circuitStatus: "closed",
    userStatus: "active",
    opportunityStatus: "available",
    compareReady: true,
    staleAtMs: 999_000,
    expectedProfitUsdt: "10",
    tradePricingVersion: 1,
    opportunityPricingVersion: 1,
    simulationPayoutFeasible: true,
    listingLegsFresh: true,
    rematchCount: 0,
    policy: {
      minProfitUsdt: "5",
      staleAllowanceSec: 3,
      maxRematchCount: 2,
      retryWaitSec: 4,
    },
    presentationDurationSec: 15,
  });
  if (durA !== durB || durA !== "MATCH_SUCCESS") {
    fail(`presentationDurationSec must not change result (${durA}/${durB})`);
  }

  const goldenDir = path.join(root, "services/engine-rust/testdata/golden");
  const fs = require("node:fs");
  const safeStopGoldens = [
    ["price_moved_stale.json", "PRICE_MOVED"],
    ["below_min_profit.json", "BELOW_MIN_PROFIT"],
    ["circuit_open.json", "CIRCUIT_OPEN"],
  ];
  for (const [file, expect] of safeStopGoldens) {
    const g = JSON.parse(fs.readFileSync(path.join(goldenDir, file), "utf8"));
    const world = createWorld({});
    const p = participateReady(world, {
      expectedProfitUsdt: String(g.context.expectedProfitUsdt),
      idempotencyKey: `idem-${expect}`,
      tradeId: `22222222-2222-4222-8222-22222222222${expect.length}`,
    });
    if (!p.ok) {
      fail(`${expect} participate failed ${p.code}`);
      continue;
    }
    const tick = executeTick(world, g.context);
    if (tick.resultCode !== expect) {
      fail(`${expect} tick want ${expect} got ${tick.resultCode}`);
    }
    if (tick.consumer !== "StoppedSafely") {
      fail(`${expect} consumer want StoppedSafely got ${tick.consumer}`);
    }
    if (world.buckets.profit !== "0") {
      fail(`${expect} must not credit profit`);
    }
    if (world.buckets.principal !== "100" || world.buckets.locked !== "0") {
      fail(`${expect} must unlock capital to principal`);
    }
    if (userLiability(world) !== world.openingLiability) {
      fail(`${expect} must restore opening liability`);
    }
    if (!world.journalByKey.has(`participate_unlock:${world.trade.id}`)) {
      fail(`${expect} must post participate_unlock`);
    }
    if (world.journalByKey.has(`settlement:${world.trade.id}`)) {
      fail(`${expect} must not post settlement`);
    }
    const again = executeTick(world, g.context);
    if (!again.noop) fail(`${expect} terminal tick must no-op`);
    const unlocks = world.journals.filter((j) => j.journalType === "participate_unlock");
    if (unlocks.length !== 1) {
      fail(`${expect} double unlock forbidden, got ${unlocks.length}`);
    }
  }

  const timeoutWorld = createWorld({});
  participateReady(timeoutWorld, { idempotencyKey: "idem-timeout" });
  const timeoutTick = executeTick(timeoutWorld, {
    nowMs: 1_000_000 + 90_000,
    participateAcceptedAtMs: 1_000_000,
    circuitStatus: "closed",
    userStatus: "active",
    opportunityStatus: "available",
    compareReady: true,
    staleAtMs: 999_000,
    expectedProfitUsdt: "10",
    tradePricingVersion: 1,
    opportunityPricingVersion: 1,
    simulationPayoutFeasible: true,
    listingLegsFresh: true,
    rematchCount: 0,
    policy: {
      minProfitUsdt: "5",
      staleAllowanceSec: 3,
      maxRematchCount: 2,
      retryWaitSec: 4,
    },
    presentationDurationSec: 12,
  });
  if (timeoutTick.resultCode !== "MATCH_TIMEOUT") {
    fail(`hard wall want MATCH_TIMEOUT got ${timeoutTick.resultCode}`);
  }
  if (timeoutTick.consumer !== "StoppedSafely") {
    fail("MATCH_TIMEOUT consumer must be StoppedSafely");
  }
  if (timeoutWorld.buckets.profit !== "0" || timeoutWorld.buckets.locked !== "0") {
    fail("MATCH_TIMEOUT must unlock and not credit profit");
  }

  const failedWorld = createWorld({});
  participateReady(failedWorld, { idempotencyKey: "idem-failed" });
  const failedTick = executeTick(failedWorld, { missingOpportunity: true });
  if (failedTick.resultCode !== "SYSTEM_FAILED" || failedTick.consumer !== "Failed") {
    fail(
      `missing opportunity want Failed/SYSTEM_FAILED got ${failedTick.consumer}/${failedTick.resultCode}`,
    );
  }
  if (failedWorld.buckets.profit !== "0" || failedWorld.buckets.principal !== "100") {
    fail("SYSTEM_FAILED must unlock capital and not credit profit");
  }

  const rq = JSON.parse(
    fs.readFileSync(path.join(goldenDir, "requeue_then_success.json"), "utf8"),
  );
  const rqWorld = createWorld({});
  participateReady(rqWorld, { idempotencyKey: "idem-requeue" });
  const step0 = executeTick(rqWorld, rq.steps[0].context);
  if (step0.resultCode !== "REQUEUE" || step0.consumer !== "MatchingRetrying") {
    fail(`requeue step0 want MatchingRetrying/REQUEUE got ${step0.consumer}/${step0.resultCode}`);
  }
  if (rqWorld.buckets.locked !== "100" || rqWorld.journals.length !== 1) {
    fail("REQUEUE must keep lock and post no settlement/unlock");
  }
  const step1 = executeTick(rqWorld, rq.steps[1].context);
  if (step1.resultCode !== "MATCH_SUCCESS" || step1.consumer !== "Settled") {
    fail(`requeue step1 want Settled/MATCH_SUCCESS got ${step1.consumer}/${step1.resultCode}`);
  }
  if (rqWorld.buckets.profit !== "10" || rqWorld.buckets.locked !== "0") {
    fail("requeue then success must settle once");
  }

  const mismatch = createWorld({});
  const badAmt = participateReady(mismatch, {
    amountUsdt: "50",
    requiredCapitalUsdt: "100",
  });
  if (badAmt.code !== "VALIDATION_ERROR") {
    fail(`amount≠required want VALIDATION_ERROR got ${badAmt.code}`);
  }
  if (mismatch.journals.length !== 0) {
    fail("validation reject must not lock capital");
  }

  const poor = createWorld({ principal: "10" });
  const short = participateReady(poor, { amountUsdt: "100", requiredCapitalUsdt: "100" });
  if (short.code !== "INSUFFICIENT_PRINCIPAL") {
    fail(`short principal want INSUFFICIENT_PRINCIPAL got ${short.code}`);
  }

  const blocked = createWorld({});
  const blockedP = participateReady(blocked, {
    guard: {
      matchBlocked: true,
      compareReady: true,
      nowMs: 1000,
      staleAtMs: 999,
    },
  });
  if (blockedP.code !== "MATCH_BLOCKED") {
    fail(`P0b want MATCH_BLOCKED got ${blockedP.code}`);
  }
  if (blocked.journals.length !== 0) {
    fail("MATCH_BLOCKED must not lock capital");
  }

  const lockTwice = createWorld({});
  participateReady(lockTwice, { idempotencyKey: "same-key" });
  participateReady(lockTwice, { idempotencyKey: "same-key" });
  const locks = lockTwice.journals.filter((j) => j.journalType === "participate_lock");
  if (locks.length !== 1) {
    fail(`same idempotency lock must post once, got ${locks.length}`);
  }
  if (lockTwice.buckets.locked !== "100") {
    fail("replayed participate_lock must not double-lock");
  }

  return {
    fails,
    proven: {
      success: ["MATCH_SUCCESS"],
      safeStop: [...SAFE_STOP_CODES],
      failed: ["SYSTEM_FAILED"],
      requeueThenSuccess: true,
      idempotentSettlement: true,
      idempotentUnlock: true,
      idempotentLock: true,
      negatives: [
        "VALIDATION_ERROR",
        "INSUFFICIENT_PRINCIPAL",
        "MATCH_BLOCKED",
        "SETTLED_REQUIRES_PROFIT",
        "PRESENTATION_NE_CREDIT",
      ],
    },
  };
}

module.exports = {
  SAFE_STOP_CODES,
  consumerState,
  createWorld,
  participate,
  executeTick,
  runAll,
  userLiability,
};
