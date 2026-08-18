/**
 * KRW deposit host tests — tsc compile like current-fx apply tests.
 */
const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const here = __dirname;
const outDir = path.join(here, "_test_out");
const tscBin = path.join(__dirname, "../../../../node_modules/typescript/bin/tsc");
const sources = [
  path.join(here, "krw-deposit.apply.ts"),
  path.join(here, "krw-deposit.money.ts"),
  path.join(here, "krw-deposit.fx.ts"),
  path.join(here, "wallet.events.ts"),
  path.join(here, "wallet.types.ts"),
  path.join(here, "../ledger/ledger.money.ts"),
  path.join(here, "../ledger/ledger.types.ts"),
];
const tsc = spawnSync(
  process.execPath,
  [
    tscBin,
    "--pretty",
    "false",
    "--skipLibCheck",
    "--module",
    "commonjs",
    "--target",
    "ES2022",
    "--esModuleInterop",
    "--outDir",
    outDir,
    ...sources,
  ],
  { encoding: "utf8" },
);
if (tsc.status !== 0) {
  throw new Error(`tsc krw-deposit host failed:\n${tsc.stdout}\n${tsc.stderr}`);
}

const { KrwDepositHost } = require(path.join(outDir, "wallet/krw-deposit.apply.js"));
const { krwToUsdt } = require(path.join(outDir, "wallet/krw-deposit.money.js"));

function journalOf(input) {
  return {
    id: input.id,
    idempotencyKey: input.key,
    journalType: "deposit_krw",
    referenceType: "krw_deposit_request",
    referenceId: "r",
    memo: null,
    fxSnapshotId: input.fxSnapshotId,
    createdBy: "admin-1",
    createdAt: new Date().toISOString(),
    reused: input.reused ?? false,
    entries: [
      {
        id: `${input.id}-d`,
        journalId: input.id,
        accountId: "ops",
        direction: "debit",
        amountUsdt: input.amountUsdt,
        createdAt: new Date().toISOString(),
      },
      {
        id: `${input.id}-c`,
        journalId: input.id,
        accountId: `principal:${input.userId}`,
        direction: "credit",
        amountUsdt: input.amountUsdt,
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

function harness() {
  const snapshots = [];
  const requests = new Map();
  const byIdem = new Map();
  const journals = new Map();
  let fxReads = 0;
  let postCount = 0;
  let failFinalize = false;
  let seq = 0;

  const query = async (sql, params = []) => {
    if (/SET status = 'expired'/.test(sql)) return { rows: [], rowCount: 0 };
    if (/FROM public\.fx_snapshots/.test(sql) && /WHERE id =/.test(sql)) {
      fxReads += 1;
      const snap = snapshots.find((s) => s.id === params[0]);
      return { rows: snap ? [snap] : [], rowCount: snap ? 1 : 0 };
    }
    if (/FROM public\.fx_snapshots/.test(sql) && /ORDER BY captured_at/.test(sql)) {
      fxReads += 1;
      const latest = [...snapshots].sort((a, b) =>
        b.captured_at.localeCompare(a.captured_at),
      )[0];
      return { rows: latest ? [latest] : [], rowCount: latest ? 1 : 0 };
    }
    if (
      /FROM public\.krw_deposit_requests/.test(sql) &&
      /idempotency_key = \$1/.test(sql) &&
      !/INSERT/.test(sql)
    ) {
      const row = byIdem.get(String(params[0]));
      return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
    }
    if (/INSERT INTO public\.krw_deposit_requests/.test(sql)) {
      seq += 1;
      const row = {
        id: `00000000-0000-0000-0000-00000000000${seq}`,
        user_id: params[0],
        requested_amount_krw: params[1],
        payable_amount_krw: params[2],
        unique_suffix_krw: params[3],
        deposit_code: params[4],
        depositor_name: params[5],
        status: "pending",
        expires_at: new Date(String(params[6])),
        admin_note: null,
        ledger_journal_id: null,
        idempotency_key: params[7],
        decided_at: null,
        decided_by_admin_id: null,
        created_at: new Date(),
        quote_fx_snapshot_id: params[8],
        quote_usdt_krw: params[9],
        quote_formula_id: params[10],
        quote_fx_captured_at: params[11],
        estimated_usdt: params[12],
        applied_fx_snapshot_id: null,
        applied_usdt_krw: null,
        applied_formula_id: null,
        applied_fx_captured_at: null,
        credited_usdt: null,
      };
      requests.set(String(row.id), row);
      byIdem.set(String(row.idempotency_key), row);
      return { rows: [row], rowCount: 1 };
    }
    if (/UPDATE public\.krw_deposit_requests SET\s+status = 'approved'/.test(sql)) {
      if (failFinalize) throw new Error("simulated finalize crash");
      const row = requests.get(String(params[0]));
      if (!row) return { rows: [], rowCount: 0 };
      row.status = "approved";
      row.ledger_journal_id = params[1];
      row.decided_at = new Date();
      row.decided_by_admin_id = params[2];
      row.admin_note = row.admin_note ?? "approved";
      row.applied_fx_snapshot_id = params[3];
      row.applied_usdt_krw = params[4];
      row.applied_formula_id = params[5];
      row.applied_fx_captured_at = params[6];
      row.credited_usdt = params[7];
      return { rows: [row], rowCount: 1 };
    }
    if (/UPDATE public\.krw_deposit_requests SET\s+status = 'rejected'/.test(sql)) {
      const row = requests.get(String(params[0]));
      if (!row) return { rows: [], rowCount: 0 };
      row.status = "rejected";
      row.admin_note = params[1];
      row.decided_at = new Date();
      row.decided_by_admin_id = params[2];
      row.applied_fx_snapshot_id = null;
      row.applied_usdt_krw = null;
      row.applied_formula_id = null;
      row.applied_fx_captured_at = null;
      row.credited_usdt = null;
      return { rows: [row], rowCount: 1 };
    }
    if (
      /FROM public\.krw_deposit_requests/.test(sql) &&
      /user_id = \$1/.test(sql) &&
      !/AND user_id/.test(sql)
    ) {
      const items = [...requests.values()].filter((r) => r.user_id === params[0]);
      return { rows: items, rowCount: items.length };
    }
    if (/FROM public\.krw_deposit_requests/.test(sql) && /AND user_id = \$2/.test(sql)) {
      const row = requests.get(String(params[0]));
      if (!row || row.user_id !== params[1]) return { rows: [], rowCount: 0 };
      return { rows: [row], rowCount: 1 };
    }
    if (/FROM public\.krw_deposit_requests/.test(sql) && /id = \$1/.test(sql)) {
      const row = requests.get(String(params[0]));
      return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
    }
    return { rows: [], rowCount: 0 };
  };

  const svc = new KrwDepositHost({
    db: {
      query,
      withTransaction: async (fn) => fn({ query }),
    },
    posting: {
      postJournal: async (input) => {
        const existing = journals.get(input.idempotencyKey);
        if (existing) return { ...existing, reused: true };
        postCount += 1;
        const credit = input.lines.find((l) => l.account && l.account.userId);
        const created = journalOf({
          id: `j-${postCount}`,
          key: input.idempotencyKey,
          amountUsdt: credit?.amountUsdt ?? "0",
          fxSnapshotId: String(input.fxSnapshotId ?? ""),
          userId: String(credit?.account.userId ?? "u"),
        });
        journals.set(input.idempotencyKey, created);
        return created;
      },
      getByIdempotencyKey: async (key) => journals.get(key) ?? null,
      getJournal: async (id) => {
        for (const j of journals.values()) {
          if (j.id === id) return j;
        }
        throw new Error("journal not found");
      },
    },
    provision: { provisionUserBucketAccounts: async () => undefined },
    bus: { emit: () => undefined },
  });

  return {
    svc,
    snapshots,
    requests,
    journals,
    stats: () => ({ fxReads, postCount }),
    setFailFinalize: (v) => {
      failFinalize = v;
    },
  };
}

const USER_A = "11111111-1111-1111-1111-111111111111";
const USER_B = "22222222-2222-2222-2222-222222222222";
const ADMIN = "33333333-3333-3333-3333-333333333333";

describe("krwToUsdt deposit precision", () => {
  it("truncates toward zero and keeps quote≠final when rates differ", () => {
    const payable = 1_000_037;
    const estimated = krwToUsdt(payable, "1400.25");
    const credited = krwToUsdt(payable, "1410.5");
    assert.notEqual(estimated, credited);
    assert.match(estimated, /^[0-9]+(\.[0-9]+)?$/);
  });

  it("rejects non-positive payable and rate", () => {
    assert.throws(() => krwToUsdt(0, "1400"), /payableAmountKrw invalid/);
    assert.throws(() => krwToUsdt(1000, "0"), /usd_krw must be > 0/);
  });
});

describe("KrwDepositHost semantic gaps", () => {
  it("create selects quote snapshot once and estimates payable / quote rate", async () => {
    const h = harness();
    h.snapshots.push({
      id: "fx_q",
      usd_krw: "1400.25",
      formula_id: "cg_usdt_krw",
      captured_at: "2026-08-18T00:00:00.000Z",
    });
    const created = await h.svc.createRequest({
      userId: USER_A,
      requestedAmountKrw: 1_000_000,
      depositorName: "홍길동",
      idempotencyKey: "idem-create-1",
    });
    assert.equal(h.stats().fxReads, 1);
    assert.equal(
      created.payableAmountKrw,
      created.requestedAmountKrw + created.uniqueSuffixKrw,
    );
    assert.equal(created.payableSuffixRole, "bank_transfer_identification");
    assert.ok(created.quote);
    assert.equal(created.quote.fxSnapshotId, "fx_q");
    assert.equal(
      created.estimatedUsdt,
      krwToUsdt(created.payableAmountKrw, created.quote.usdtKrw),
    );
    assert.equal(created.final, null);
  });

  it("quote is not a locked rate — later approval may credit a different USDT", async () => {
    const h = harness();
    h.snapshots.push({
      id: "fx_q",
      usd_krw: "1400.25",
      formula_id: "cg_usdt_krw",
      captured_at: "2026-08-18T00:00:00.000Z",
    });
    const created = await h.svc.createRequest({
      userId: USER_A,
      requestedAmountKrw: 1_000_000,
      depositorName: "홍길동",
      idempotencyKey: "idem-create-2",
    });
    h.snapshots.push({
      id: "fx_a",
      usd_krw: "1410.5",
      formula_id: "cg_usdt_krw",
      captured_at: "2026-08-18T01:00:00.000Z",
    });
    const decided = await h.svc.approve({
      id: created.id,
      adminId: ADMIN,
      idempotencyKey: "idem-approve-2",
    });
    assert.ok(decided.request.final);
    assert.notEqual(created.estimatedUsdt, decided.request.final.creditedUsdt);
    assert.equal(
      decided.request.final.creditedUsdt,
      krwToUsdt(created.payableAmountKrw, "1410.5"),
    );
    assert.equal(decided.request.final.appliedFxSnapshotId, "fx_a");
    assert.equal(decided.request.final.creditedUsdt, decided.amountUsdt);
    const journal = [...h.journals.values()][0];
    const credit = journal.entries.find((e) => e.direction === "credit");
    assert.equal(decided.request.final.creditedUsdt, credit.amountUsdt);
    assert.equal(decided.request.final.ledgerJournalId, journal.id);
  });

  it("crash after journal commit then retry does not revalue or double credit", async () => {
    const h = harness();
    h.snapshots.push({
      id: "fx_q",
      usd_krw: "1400.25",
      formula_id: "cg_usdt_krw",
      captured_at: "2026-08-18T00:00:00.000Z",
    });
    const created = await h.svc.createRequest({
      userId: USER_A,
      requestedAmountKrw: 1_000_000,
      depositorName: "홍길동",
      idempotencyKey: "idem-create-3",
    });
    h.snapshots.push({
      id: "fx_a",
      usd_krw: "1410.5",
      formula_id: "cg_usdt_krw",
      captured_at: "2026-08-18T01:00:00.000Z",
    });
    h.setFailFinalize(true);
    await assert.rejects(
      () =>
        h.svc.approve({
          id: created.id,
          adminId: ADMIN,
          idempotencyKey: "idem-approve-3",
        }),
      /simulated finalize crash/,
    );
    assert.equal(h.stats().postCount, 1);
    assert.equal(h.requests.get(created.id).status, "pending");
    const original = [...h.journals.values()][0];
    h.snapshots.push({
      id: "fx_b",
      usd_krw: "1500",
      formula_id: "cg_usdt_krw",
      captured_at: "2026-08-18T02:00:00.000Z",
    });
    h.setFailFinalize(false);
    const recovered = await h.svc.approve({
      id: created.id,
      adminId: ADMIN,
      idempotencyKey: "idem-approve-3b",
    });
    assert.equal(h.stats().postCount, 1);
    assert.equal(recovered.request.status, "approved");
    assert.equal(
      recovered.request.final.creditedUsdt,
      original.entries[1].amountUsdt,
    );
    assert.equal(recovered.request.final.appliedFxSnapshotId, "fx_a");
    assert.notEqual(recovered.request.final.appliedFxSnapshotId, "fx_b");
  });

  it("reject writes no journal and keeps creditedUsdt null", async () => {
    const h = harness();
    h.snapshots.push({
      id: "fx_q",
      usd_krw: "1400.25",
      formula_id: "cg_usdt_krw",
      captured_at: "2026-08-18T00:00:00.000Z",
    });
    const created = await h.svc.createRequest({
      userId: USER_A,
      requestedAmountKrw: 1_000_000,
      depositorName: "홍길동",
      idempotencyKey: "idem-create-4",
    });
    const rejected = await h.svc.reject({
      id: created.id,
      adminId: ADMIN,
      idempotencyKey: "idem-reject-4",
      reason: "입금 내역을 확인할 수 없습니다",
    });
    assert.equal(h.stats().postCount, 0);
    assert.equal(rejected.request.status, "rejected");
    assert.equal(rejected.request.final, null);
    assert.equal(rejected.request.estimatedUsdt, created.estimatedUsdt);
    assert.equal(h.requests.get(created.id).credited_usdt, null);
  });

  it("consumer own-read hides other users as 404", async () => {
    const h = harness();
    h.snapshots.push({
      id: "fx_q",
      usd_krw: "1400.25",
      formula_id: "cg_usdt_krw",
      captured_at: "2026-08-18T00:00:00.000Z",
    });
    const a = await h.svc.createRequest({
      userId: USER_A,
      requestedAmountKrw: 1_000_000,
      depositorName: "홍길동",
      idempotencyKey: "idem-create-5a",
    });
    await h.svc.createRequest({
      userId: USER_B,
      requestedAmountKrw: 500_000,
      depositorName: "김철수",
      idempotencyKey: "idem-create-5b",
    });
    const listed = await h.svc.listForUser({ userId: USER_A });
    assert.equal(listed.items.length, 1);
    assert.equal(listed.items[0].id, a.id);
    const own = await h.svc.getForUser(USER_A, a.id);
    assert.equal(own.id, a.id);
    await assert.rejects(
      () => h.svc.getForUser(USER_A, "00000000-0000-0000-0000-000000000099"),
      /not found/,
    );
    const bId = [...h.requests.values()].find((r) => r.user_id === USER_B).id;
    await assert.rejects(() => h.svc.getForUser(USER_A, bId), /not found/);
  });

  it("zero/invalid and missing snapshot fail closed without fake zero final", async () => {
    const h = harness();
    await assert.rejects(
      () =>
        h.svc.createRequest({
          userId: USER_A,
          requestedAmountKrw: 0,
          depositorName: "홍길동",
          idempotencyKey: "idem-zero",
        }),
      /requestedAmountKrw/,
    );
    await assert.rejects(
      () =>
        h.svc.createRequest({
          userId: USER_A,
          requestedAmountKrw: 1000,
          depositorName: "홍길동",
          idempotencyKey: "idem-nofx",
        }),
      /FX_SNAPSHOT_REQUIRED/,
    );
    h.snapshots.push({
      id: "fx_q",
      usd_krw: "1400.25",
      formula_id: "cg_usdt_krw",
      captured_at: "2026-08-18T00:00:00.000Z",
    });
    const created = await h.svc.createRequest({
      userId: USER_A,
      requestedAmountKrw: 1000,
      depositorName: "홍길동",
      idempotencyKey: "idem-pending-null",
    });
    assert.equal(created.final, null);
    assert.notEqual(created.estimatedUsdt, "0");
  });
});
