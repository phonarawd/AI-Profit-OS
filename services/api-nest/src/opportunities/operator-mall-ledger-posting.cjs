/**
 * 쇼핑몰 지급을 기존 LedgerPostingService 정산 라인으로 연결한다.
 * SYS:OPPORTUNITY_POOL debit + 회원 profit credit (trades MATCH_SUCCESS 이익 레그 재사용).
 * 원금 lock/unlock 을 새로 만들지 않는다. 운영 DATABASE_URL 금지.
 */
"use strict";

const path = require("node:path");
const { createRequire } = require("node:module");

const SYSTEM_OPPORTUNITY_POOL = "SYS:OPPORTUNITY_POOL";

function mallSettlementLines(userId, amountUsdt) {
  return [
    {
      account: { systemCode: SYSTEM_OPPORTUNITY_POOL },
      direction: "debit",
      amountUsdt,
    },
    {
      account: { userId, bucket: "profit" },
      direction: "credit",
      amountUsdt,
    },
  ];
}

function profitCreditAmount(posted) {
  const entries = (posted && posted.entries) || [];
  const credit = entries.find((e) => e && e.direction === "credit");
  if (credit && credit.amountUsdt != null) return String(credit.amountUsdt);
  return null;
}

function mapPostedJournal(posted, userId, fallbackAmount) {
  if (!posted || !posted.id) return null;
  return {
    id: String(posted.id),
    journalId: String(posted.id),
    idempotencyKey: posted.idempotencyKey,
    journalType: posted.journalType || "settlement",
    referenceType: posted.referenceType || "participation",
    referenceId: posted.referenceId != null ? String(posted.referenceId) : null,
    userId: String(userId),
    amountUsdt: profitCreditAmount(posted) || fallbackAmount,
    reused: posted.reused === true,
    entries: posted.entries || [],
  };
}

function createIsolatedPostingDb(db) {
  return {
    configured() {
      return true;
    },
    query(text, params) {
      return db.query(text, params);
    },
    withTransaction(fn) {
      return db.withTransaction(fn);
    },
  };
}

function loadPostingClasses() {
  const nestRequire = createRequire(path.join(__dirname, "..", "..", "package.json"));
  const { LedgerPostingService } = nestRequire("./src/ledger/ledger.posting.service.ts");
  const { LedgerOutboxService } = nestRequire("./src/ledger/ledger.outbox.service.ts");
  const { InProcessEventBus } = nestRequire("./src/events/in-process.bus.ts");
  return { LedgerPostingService, LedgerOutboxService, InProcessEventBus };
}

function createMallLedgerPosting(db) {
  if (!db || typeof db.query !== "function" || typeof db.withTransaction !== "function") {
    const err = new Error("LEDGER_POSTING_REQUIRED");
    err.code = "LEDGER_POSTING_REQUIRED";
    throw err;
  }
  const { LedgerPostingService, LedgerOutboxService, InProcessEventBus } = loadPostingClasses();
  const adapter = createIsolatedPostingDb(db);
  const bus = new InProcessEventBus();
  const outbox = new LedgerOutboxService(adapter, bus);
  const posting = new LedgerPostingService(adapter, outbox);
  return {
    kind: "official_ledger_posting",
    notQaSettlementTable: true,
    async postMallSettlement(input) {
      const userId = String(input.userId);
      const amountUsdt = String(input.amountUsdt);
      const posted = await posting.postJournal({
        idempotencyKey: input.idempotencyKey,
        journalType: "settlement",
        referenceType: "participation",
        referenceId: String(input.participationId),
        memo: "MATCH_SUCCESS mall settlement",
        fxSnapshotId: input.fxSnapshotId || null,
        createdBy: userId,
        lines: mallSettlementLines(userId, amountUsdt),
      });
      return mapPostedJournal(posted, userId, amountUsdt);
    },
    async getByIdempotencyKey(key) {
      const posted = await posting.getByIdempotencyKey(key);
      if (!posted) return null;
      const userId =
        (posted.createdBy && String(posted.createdBy)) ||
        "";
      return mapPostedJournal(posted, userId, profitCreditAmount(posted));
    },
    postJournal(input) {
      return posting.postJournal(input);
    },
  };
}

module.exports = {
  SYSTEM_OPPORTUNITY_POOL,
  mallSettlementLines,
  profitCreditAmount,
  mapPostedJournal,
  createMallLedgerPosting,
};
