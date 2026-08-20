/**
 * B-WALLET-003 인프로세스 Wallet money/security E2E.
 * 소유자 규칙만 재현. 새 FX/출금 분개/잔액 UPDATE 없음.
 * 브라우저/원격 DB 쓰기 없음.
 */
"use strict";

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

/** chain-watcher.stages.ts decideDepositStage 와 동일 */
function decideDepositStage(input) {
  const ui = 1;
  const ledger = 19;
  if (input.alreadyLedgerCredited) {
    return {
      stage: "confirmed",
      creditLedger: false,
      emitDetected: false,
      emitConfirmed: false,
    };
  }
  if (input.reorg) {
    return {
      stage: "reorg_void",
      creditLedger: false,
      emitDetected: false,
      emitConfirmed: false,
    };
  }
  const conf = Math.max(0, Math.floor(Number(input.confirmations) || 0));
  if (conf >= ledger) {
    return {
      stage: "confirmed",
      creditLedger: true,
      emitDetected: false,
      emitConfirmed: true,
    };
  }
  if (conf >= ui) {
    return {
      stage: "detected",
      creditLedger: false,
      emitDetected: true,
      emitConfirmed: false,
    };
  }
  return {
    stage: "unseen",
    creditLedger: false,
    emitDetected: false,
    emitConfirmed: false,
  };
}

function participateGate(_kycStatus) {
  return { ok: true, status: 200, kycRequired: false };
}

function assertWithdrawKyc(kycStatus) {
  return kycStatus === "approved" ? null : "KYC_WITHDRAW_REQUIRED";
}

function assertWithdrawApplyAllowed(cap) {
  return cap.withdrawApplyBlocked === true ? "WITHDRAW_APPLY_BLOCKED" : null;
}

function resolveDebits(mode, amountUsdt, input) {
  if (mode === "profit") {
    return {
      debitProfitUsdt: amountUsdt,
      debitPrincipalUsdt: "0",
      requirePrincipalConfirm: false,
    };
  }
  if (mode === "principal") {
    return {
      debitProfitUsdt: "0",
      debitPrincipalUsdt: amountUsdt,
      requirePrincipalConfirm: true,
    };
  }
  const profit = input.debitProfitUsdt ?? "0";
  const principal = input.debitPrincipalUsdt ?? "0";
  if (num(profit) + num(principal) !== num(amountUsdt)) {
    return { error: "combined debitProfitUsdt+debitPrincipalUsdt must equal amountUsdt" };
  }
  if (num(principal) <= 0) {
    return { error: "combined requires debitPrincipalUsdt > 0" };
  }
  return {
    debitProfitUsdt: profit,
    debitPrincipalUsdt: principal,
    requirePrincipalConfirm: true,
  };
}

const LEDGER_AMOUNT_RE = /^-?[0-9]+(\.[0-9]+)?$/;

function asLedgerAmount(v) {
  return typeof v === "string" && LEDGER_AMOUNT_RE.test(v) ? v : undefined;
}

function normalizeWalletBuckets(raw) {
  const userId = typeof raw.userId === "string" ? raw.userId : "";
  const principalUsdt = asLedgerAmount(raw.principalUsdt);
  const profitUsdt = asLedgerAmount(raw.profitUsdt);
  const lockedUsdt = asLedgerAmount(raw.lockedUsdt);
  const practiceUsdt = asLedgerAmount(raw.practiceUsdt);
  const liabilityUsdt = asLedgerAmount(raw.liabilityUsdt);
  if (
    !userId ||
    !principalUsdt ||
    !profitUsdt ||
    !lockedUsdt ||
    !practiceUsdt ||
    !liabilityUsdt
  ) {
    throw new Error("wallet_buckets_unavailable");
  }
  return {
    userId,
    principalUsdt,
    profitUsdt,
    lockedUsdt,
    practiceUsdt,
    liabilityUsdt,
  };
}

function projectUserJournalItems(rows, sessionUserId) {
  if (!sessionUserId) return [];
  return rows.filter((row) => row.owner_user_id === sessionUserId);
}

function createWorld(start) {
  const world = {
    buckets: {
      principal: start.principal ?? "100",
      locked: start.locked ?? "0",
      profit: start.profit ?? "40",
      practice: start.practice ?? "10",
    },
    system: {
      treasury: start.treasury ?? "1000000",
      opsPool: start.opsPool ?? "1000000",
    },
    journals: [],
    journalByKey: new Map(),
    withdrawIntents: [],
    withdrawByKey: new Map(),
    krwRequests: new Map(),
  };
  world.openingLiability = userLiability(world);
  return world;
}

function applyLine(world, line) {
  const amt = line.amountUsdt;
  if (line.account.systemCode === "SYS:TREASURY") {
    world.system.treasury =
      line.direction === "debit"
        ? sub(world.system.treasury, amt)
        : add(world.system.treasury, amt);
    return;
  }
  if (line.account.systemCode === "OPS_POOL") {
    world.system.opsPool =
      line.direction === "debit"
        ? sub(world.system.opsPool, amt)
        : add(world.system.opsPool, amt);
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

function observeUsdtDeposit(world, input) {
  const decision = decideDepositStage({
    confirmations: input.confirmations,
    reorg: input.reorg,
    alreadyLedgerCredited: input.alreadyLedgerCredited,
  });
  if (!decision.creditLedger) {
    return { ok: true, creditLedger: false, decision };
  }
  const posted = postJournal(world, {
    idempotencyKey: `usdt_deposit_confirm:${input.txHash}:${input.toAddress}`,
    journalType: "deposit_usdt",
    lines: [
      {
        account: { systemCode: "SYS:TREASURY" },
        direction: "debit",
        amountUsdt: input.amountUsdt,
      },
      {
        account: { userId: input.userId, bucket: "principal" },
        direction: "credit",
        amountUsdt: input.amountUsdt,
      },
    ],
  });
  return {
    ok: true,
    creditLedger: true,
    created: posted.created,
    decision,
  };
}

function createKrwRequest(world, input) {
  const requested = input.requestedAmountKrw;
  const suffix = input.uniqueSuffixKrw;
  if (!Number.isInteger(requested) || requested < 1) {
    return { ok: false, code: "INVALID_REQUESTED" };
  }
  if (!Number.isInteger(suffix) || suffix < 0) {
    return { ok: false, code: "INVALID_SUFFIX" };
  }
  const payable = requested + suffix;
  const req = {
    id: input.id,
    userId: input.userId,
    requestedAmountKrw: requested,
    uniqueSuffixKrw: suffix,
    payableAmountKrw: payable,
    status: "pending",
    creditedUsdt: null,
  };
  world.krwRequests.set(req.id, req);
  return { ok: true, request: req };
}

function matchKrwRequest(world, id) {
  const req = world.krwRequests.get(id);
  if (!req || req.status !== "pending") return { ok: false, code: "NOT_PENDING" };
  req.status = "matched";
  return { ok: true, request: req };
}

function approveKrwRequest(world, input) {
  if (!input.adminId) return { ok: false, code: "ADMIN_REQUIRED" };
  const req = world.krwRequests.get(input.id);
  if (!req) return { ok: false, code: "NOT_FOUND" };
  if (req.status !== "pending" && req.status !== "matched") {
    return { ok: false, code: `cannot approve status=${req.status}` };
  }
  const posted = postJournal(world, {
    idempotencyKey: `krw_deposit_approve:${req.id}`,
    journalType: "deposit_krw",
    lines: [
      {
        account: { systemCode: "OPS_POOL" },
        direction: "debit",
        amountUsdt: input.creditedUsdt,
      },
      {
        account: { userId: req.userId, bucket: "principal" },
        direction: "credit",
        amountUsdt: input.creditedUsdt,
      },
    ],
  });
  req.status = "approved";
  req.creditedUsdt = input.creditedUsdt;
  return { ok: true, created: posted.created, request: req };
}

function rejectKrwRequest(world, id) {
  const req = world.krwRequests.get(id);
  if (!req) return { ok: false, code: "NOT_FOUND" };
  req.status = "rejected";
  return { ok: true, request: req };
}

function createWithdraw(world, input) {
  if (!input.userId) return { ok: false, code: "AUTH_REQUIRED" };
  if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
    return { ok: false, code: "IDEMPOTENCY_REQUIRED" };
  }
  if (!input.stepUpToken) {
    return { ok: false, code: "WITHDRAW_STEP_UP_REQUIRED" };
  }
  const mode = input.mode ?? "profit";
  if (mode !== "profit" && mode !== "principal" && mode !== "combined") {
    return { ok: false, code: "INVALID_MODE" };
  }
  if (input.asset !== "USDT" && input.asset !== "KRW") {
    return { ok: false, code: "INVALID_ASSET" };
  }
  if (num(input.amountUsdt) <= 0) {
    return { ok: false, code: "AMOUNT_MUST_BE_POSITIVE" };
  }
  const blocked = assertWithdrawApplyAllowed({
    withdrawApplyBlocked: input.withdrawApplyBlocked === true,
  });
  if (blocked) return { ok: false, code: blocked };
  const kyc = assertWithdrawKyc(input.kycStatus);
  if (kyc) return { ok: false, code: kyc };
  if (input.practiceDebitAttempt === true || input.requestedBucket === "practice") {
    return { ok: false, code: "PRACTICE_NOT_WITHDRAWABLE" };
  }
  const debits = resolveDebits(mode, input.amountUsdt, input);
  if (debits.error) return { ok: false, code: debits.error };
  if (debits.requirePrincipalConfirm) {
    const tok = (input.principalConfirmToken || "").trim();
    if (!tok || tok.length < 8) {
      return { ok: false, code: "PRINCIPAL_CONFIRM_REQUIRED" };
    }
  }
  const existing = world.withdrawByKey.get(input.idempotencyKey);
  if (existing) return { ok: true, reused: true, intent: existing };
  const intent = {
    id: `w-${world.withdrawIntents.length + 1}`,
    userId: input.userId,
    mode,
    asset: input.asset,
    amountUsdt: input.amountUsdt,
    debitProfitUsdt: debits.debitProfitUsdt,
    debitPrincipalUsdt: debits.debitPrincipalUsdt,
    status: "auth_ok",
    idempotencyKey: input.idempotencyKey,
  };
  world.withdrawIntents.push(intent);
  world.withdrawByKey.set(input.idempotencyKey, intent);
  return { ok: true, reused: false, intent };
}

function assertInvariant(world, fail, label) {
  if (userLiability(world) !== add(
    add(world.buckets.principal, world.buckets.locked),
    add(world.buckets.profit, world.buckets.practice),
  )) {
    fail(`${label}: liability formula drift`);
  }
}

function runAll() {
  const fails = [];
  const fail = (msg) => fails.push(msg);

  const world = createWorld({});
  assertInvariant(world, fail, "open");

  const unseen = observeUsdtDeposit(world, {
    userId: "u1",
    txHash: "tx-a",
    toAddress: "addr-a",
    amountUsdt: "25",
    confirmations: 0,
  });
  if (unseen.creditLedger) fail("0conf must not credit ledger");
  if (world.buckets.principal !== "100") fail("0conf must leave principal unchanged");

  const oneConf = observeUsdtDeposit(world, {
    userId: "u1",
    txHash: "tx-a",
    toAddress: "addr-a",
    amountUsdt: "25",
    confirmations: 1,
  });
  if (oneConf.creditLedger) fail("1conf must not credit ledger");
  if (oneConf.decision.emitDetected !== true) fail("1conf must emit detected");
  if (world.buckets.principal !== "100") fail("1conf must leave principal unchanged");
  if (userLiability(world) !== world.openingLiability) {
    fail("1conf must not change user liability");
  }

  const credited = observeUsdtDeposit(world, {
    userId: "u1",
    txHash: "tx-a",
    toAddress: "addr-a",
    amountUsdt: "25",
    confirmations: 19,
  });
  if (!credited.creditLedger || !credited.created) {
    fail("19conf must credit ledger once");
  }
  if (world.buckets.principal !== "125") fail("19conf must credit principal +25");
  if (userLiability(world) !== "175") fail("19conf liability must rise by credited amount");

  const reuse19 = observeUsdtDeposit(world, {
    userId: "u1",
    txHash: "tx-a",
    toAddress: "addr-a",
    amountUsdt: "25",
    confirmations: 19,
    alreadyLedgerCredited: true,
  });
  if (reuse19.creditLedger) fail("already credited 19conf must not credit again");
  if (world.buckets.principal !== "125") fail("USDT credit must be idempotent");

  const reorg = observeUsdtDeposit(world, {
    userId: "u1",
    txHash: "tx-b",
    toAddress: "addr-a",
    amountUsdt: "9",
    confirmations: 19,
    reorg: true,
  });
  if (reorg.creditLedger) fail("reorg must not credit ledger");

  const krw = createKrwRequest(world, {
    id: "krw-1",
    userId: "u1",
    requestedAmountKrw: 100000,
    uniqueSuffixKrw: 17,
  });
  if (!krw.ok) fail("KRW create should succeed");
  if (krw.request.payableAmountKrw !== 100017) {
    fail("payableAmountKrw must equal requestedAmountKrw + uniqueSuffixKrw");
  }
  if (krw.request.uniqueSuffixKrw === krw.request.requestedAmountKrw) {
    fail("suffix must not be treated as the requested amount");
  }
  if (world.journals.some((j) => j.journalType === "deposit_krw")) {
    fail("KRW pending must not post deposit_krw");
  }

  matchKrwRequest(world, "krw-1");
  if (world.buckets.principal !== "125") {
    fail("KRW matched must not credit principal");
  }

  const selfApprove = approveKrwRequest(world, {
    id: "krw-1",
    creditedUsdt: "70",
  });
  if (selfApprove.ok) fail("user self-approve must be forbidden");

  const approved = approveKrwRequest(world, {
    id: "krw-1",
    adminId: "admin-1",
    creditedUsdt: "70",
  });
  if (!approved.ok || !approved.created) fail("KRW admin approve must credit once");
  if (world.buckets.principal !== "195") fail("KRW approve must credit principal");

  const approvedAgain = approveKrwRequest(world, {
    id: "krw-1",
    adminId: "admin-1",
    creditedUsdt: "70",
  });
  if (approvedAgain.ok) fail("second approve on already-approved must fail status guard");
  const reusedJournal = postJournal(world, {
    idempotencyKey: "krw_deposit_approve:krw-1",
    journalType: "deposit_krw",
    lines: [
      { account: { systemCode: "OPS_POOL" }, direction: "debit", amountUsdt: "70" },
      { account: { userId: "u1", bucket: "principal" }, direction: "credit", amountUsdt: "70" },
    ],
  });
  if (reusedJournal.created) fail("KRW approve journal must be idempotent");
  if (world.buckets.principal !== "195") fail("KRW approve must not double credit");

  const krwReject = createKrwRequest(world, {
    id: "krw-2",
    userId: "u1",
    requestedAmountKrw: 50000,
    uniqueSuffixKrw: 3,
  });
  rejectKrwRequest(world, krwReject.request.id);
  const rejectApprove = approveKrwRequest(world, {
    id: "krw-2",
    adminId: "admin-1",
    creditedUsdt: "30",
  });
  if (rejectApprove.ok) fail("rejected KRW must not be approvable");
  if (world.buckets.principal !== "195") fail("KRW reject must not credit");

  const beforeWithdraw = {
    principal: world.buckets.principal,
    profit: world.buckets.profit,
    locked: world.buckets.locked,
    practice: world.buckets.practice,
    liability: userLiability(world),
    journals: world.journals.length,
  };

  const noKyc = createWithdraw(world, {
    userId: "u1",
    amountUsdt: "10",
    asset: "USDT",
    idempotencyKey: "withdraw-nokyc-1",
    stepUpToken: "step-token-1",
    kycStatus: "none",
  });
  if (noKyc.code !== "KYC_WITHDRAW_REQUIRED") {
    fail("withdraw without KYC must be KYC_WITHDRAW_REQUIRED");
  }

  const depositNoKyc = participateGate("none");
  if (depositNoKyc.status !== 200 || depositNoKyc.kycRequired !== false) {
    fail("deposit/participate must stay KYC-free");
  }

  const noStep = createWithdraw(world, {
    userId: "u1",
    amountUsdt: "10",
    asset: "USDT",
    idempotencyKey: "withdraw-nostep-1",
    kycStatus: "approved",
  });
  if (noStep.code !== "WITHDRAW_STEP_UP_REQUIRED") {
    fail("withdraw without step-up must be WITHDRAW_STEP_UP_REQUIRED");
  }

  const practice = createWithdraw(world, {
    userId: "u1",
    amountUsdt: "10",
    asset: "USDT",
    idempotencyKey: "withdraw-practice-1",
    stepUpToken: "step-token-1",
    kycStatus: "approved",
    practiceDebitAttempt: true,
  });
  if (practice.code !== "PRACTICE_NOT_WITHDRAWABLE") {
    fail("practice debit must be PRACTICE_NOT_WITHDRAWABLE");
  }

  const blocked = createWithdraw(world, {
    userId: "u1",
    amountUsdt: "10",
    asset: "USDT",
    idempotencyKey: "withdraw-block-1",
    stepUpToken: "step-token-1",
    kycStatus: "approved",
    withdrawApplyBlocked: true,
  });
  if (blocked.code !== "WITHDRAW_APPLY_BLOCKED") {
    fail("apply-blocked withdraw must be WITHDRAW_APPLY_BLOCKED");
  }

  const principalBare = createWithdraw(world, {
    userId: "u1",
    mode: "principal",
    amountUsdt: "10",
    asset: "USDT",
    idempotencyKey: "withdraw-prin-1",
    stepUpToken: "step-token-1",
    kycStatus: "approved",
  });
  if (principalBare.code !== "PRINCIPAL_CONFIRM_REQUIRED") {
    fail("principal withdraw must require confirm token");
  }

  const usdtOut = createWithdraw(world, {
    userId: "u1",
    amountUsdt: "10",
    asset: "USDT",
    idempotencyKey: "withdraw-usdt-1",
    stepUpToken: "step-token-1",
    kycStatus: "approved",
  });
  if (!usdtOut.ok) fail(`USDT withdraw happy path failed: ${usdtOut.code}`);
  if (usdtOut.intent.mode !== "profit") fail("default withdraw mode must be profit");
  if (usdtOut.intent.debitPrincipalUsdt !== "0") {
    fail("profit mode must not debit principal");
  }
  if (usdtOut.intent.status !== "auth_ok") {
    fail("withdraw create must stay auth_ok without inventing ledger post");
  }

  const usdtReuse = createWithdraw(world, {
    userId: "u1",
    amountUsdt: "10",
    asset: "USDT",
    idempotencyKey: "withdraw-usdt-1",
    stepUpToken: "step-token-1",
    kycStatus: "approved",
  });
  if (!usdtReuse.reused) fail("same withdraw idempotencyKey must reuse");

  const krwOut = createWithdraw(world, {
    userId: "u1",
    amountUsdt: "5",
    asset: "KRW",
    idempotencyKey: "withdraw-krw-1",
    stepUpToken: "step-token-1",
    kycStatus: "approved",
  });
  if (!krwOut.ok) fail(`KRW withdraw happy path failed: ${krwOut.code}`);
  if (krwOut.intent.mode !== "profit") fail("KRW withdraw default mode must be profit");

  if (world.buckets.principal !== beforeWithdraw.principal) {
    fail("withdraw intent must not change principal (ledger follow-up only)");
  }
  if (world.buckets.profit !== beforeWithdraw.profit) {
    fail("withdraw intent must not change profit (ledger follow-up only)");
  }
  if (world.buckets.practice !== beforeWithdraw.practice) {
    fail("withdraw intent must not touch practice");
  }
  if (userLiability(world) !== beforeWithdraw.liability) {
    fail("withdraw intent must not change liability");
  }
  if (world.journals.length !== beforeWithdraw.journals) {
    fail("withdraw intent must not invent a journal");
  }

  const availableForbidden =
    num(world.buckets.principal) + num(world.buckets.profit);
  if (String(availableForbidden) === world.buckets.profit) {
    fail("principal+profit must not collapse into profit");
  }
  if (usdtOut.intent.amountUsdt === String(availableForbidden)) {
    fail("withdraw must not treat principal+profit as available");
  }

  try {
    normalizeWalletBuckets({
      userId: "u1",
      profitUsdt: "1.00",
      lockedUsdt: "0",
      practiceUsdt: "0",
      liabilityUsdt: "1.00",
    });
    fail("missing principal must be unavailable, not 0");
  } catch (e) {
    if (!String(e.message).includes("wallet_buckets_unavailable")) {
      fail("missing bucket must throw wallet_buckets_unavailable");
    }
  }

  const zeroOk = normalizeWalletBuckets({
    userId: "u1",
    principalUsdt: "0",
    profitUsdt: "0",
    lockedUsdt: "0",
    practiceUsdt: "0",
    liabilityUsdt: "0",
  });
  if (zeroOk.principalUsdt !== "0") fail("real ledger zero must be kept");

  const mixed = [
    { id: "j-a", owner_user_id: "u1", amount_usdt: "10" },
    { id: "j-b", owner_user_id: "u2", amount_usdt: "99" },
  ];
  const scoped = projectUserJournalItems(mixed, "u1");
  if (scoped.length !== 1 || scoped[0].id !== "j-a") {
    fail("journal projection must keep only session user rows");
  }
  if (projectUserJournalItems(mixed, "").length !== 0) {
    fail("empty session must not return journal rows");
  }

  assertInvariant(world, fail, "close");
  const usdtCredits = world.journals.filter((j) => j.journalType === "deposit_usdt");
  const krwCredits = world.journals.filter((j) => j.journalType === "deposit_krw");
  if (usdtCredits.length !== 1) fail("exactly one deposit_usdt journal expected");
  if (krwCredits.length !== 1) fail("exactly one deposit_krw journal expected");

  return { fails, world };
}

module.exports = {
  runAll,
  decideDepositStage,
  participateGate,
  assertWithdrawKyc,
  normalizeWalletBuckets,
  createWithdraw,
  createWorld,
};
