/**
 * REL-015 — 유저 원장 조회 권한/페이지/decimal 코어.
 * 잔액 UPDATE 없음. 프로덕션 DB 호출 없음.
 */
const DECIMAL_RE = /^-?[0-9]+(\.[0-9]+)?$/;
const FORBIDDEN_KO = "다른 분의 내역은 볼 수 없어요";

function clampPaging(limit, offset) {
  const lim = Number(limit);
  const off = Number(offset);
  return {
    limit: Number.isFinite(lim) ? Math.min(Math.max(Math.trunc(lim), 1), 100) : 20,
    offset: Number.isFinite(off) ? Math.max(Math.trunc(off), 0) : 0,
  };
}

function isDecimalString(value) {
  return typeof value === "string" && DECIMAL_RE.test(value);
}

function decideJournalAccess(requesterUserId, ownerUserIds) {
  if (!requesterUserId) {
    return { ok: false, status: 401, code: "AUTH_REQUIRED" };
  }
  const owners = Array.isArray(ownerUserIds) ? ownerUserIds : [];
  if (!owners.includes(requesterUserId)) {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      messageKo: FORBIDDEN_KO,
    };
  }
  return { ok: true, status: 200 };
}

function toUserEntry(entry, requesterUserId) {
  const ownerUserId = entry.ownerUserId ?? null;
  const ownerType = entry.ownerType || (ownerUserId ? "user" : "system");
  if (ownerType === "user" && ownerUserId && ownerUserId !== requesterUserId) {
    return null;
  }
  const amountUsdt = String(entry.amountUsdt ?? "");
  if (!isDecimalString(amountUsdt)) {
    throw new Error("amountUsdt must be decimal string");
  }
  return {
    id: String(entry.id),
    direction: entry.direction === "debit" ? "debit" : "credit",
    amountUsdt,
    bucket: ownerUserId === requesterUserId ? entry.bucket ?? null : null,
    accountKind: String(entry.accountKind || ownerType),
  };
}

function toUserJournalView(journal, requesterUserId) {
  const entries = [];
  for (const entry of journal.entries || []) {
    const mapped = toUserEntry(entry, requesterUserId);
    if (mapped) entries.push(mapped);
  }
  return {
    id: String(journal.id),
    journalType: String(journal.journalType),
    createdAt: String(journal.createdAt),
    referenceType: journal.referenceType ?? null,
    referenceId: journal.referenceId ?? null,
    entries,
  };
}

function listJournalsForUser(store, requesterUserId, paging) {
  if (!requesterUserId) {
    return { status: 401, code: "AUTH_REQUIRED" };
  }
  const { limit, offset } = clampPaging(paging && paging.limit, paging && paging.offset);
  const own = (store.journals || [])
    .filter((j) => (j.ownerUserIds || []).includes(requesterUserId))
    .slice()
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const total = own.length;
  const items = own.slice(offset, offset + limit).map((j) =>
    toUserJournalView(j, requesterUserId),
  );
  return { status: 200, items, total, limit, offset };
}

function getJournalForUser(store, requesterUserId, journalId) {
  if (!requesterUserId) {
    return { status: 401, code: "AUTH_REQUIRED" };
  }
  const journal = (store.journals || []).find((j) => j.id === journalId);
  const owners = journal ? journal.ownerUserIds || [] : [];
  const access = decideJournalAccess(requesterUserId, owners);
  if (!access.ok) {
    return {
      status: access.status,
      code: access.code,
      messageKo: access.messageKo,
    };
  }
  return { status: 200, journal: toUserJournalView(journal, requesterUserId) };
}

function fixtureStore() {
  return {
    journals: [
      {
        id: "j-self",
        journalType: "deposit_usdt",
        createdAt: "2026-08-20T00:00:00.000Z",
        referenceType: "deposit",
        referenceId: "d-1",
        ownerUserIds: ["user-a"],
        entries: [
          {
            id: "e-1",
            direction: "credit",
            amountUsdt: "10.5",
            ownerUserId: "user-a",
            ownerType: "user",
            accountKind: "user_bucket",
            bucket: "principal",
          },
          {
            id: "e-2",
            direction: "debit",
            amountUsdt: "10.5",
            ownerUserId: null,
            ownerType: "system",
            accountKind: "treasury",
            bucket: null,
          },
          {
            id: "e-leak",
            direction: "credit",
            amountUsdt: "1",
            ownerUserId: "user-b",
            ownerType: "user",
            accountKind: "user_bucket",
            bucket: "profit",
          },
        ],
      },
      {
        id: "j-other",
        journalType: "withdraw",
        createdAt: "2026-08-19T00:00:00.000Z",
        ownerUserIds: ["user-b"],
        entries: [
          {
            id: "e-b",
            direction: "debit",
            amountUsdt: "3",
            ownerUserId: "user-b",
            ownerType: "user",
            accountKind: "user_bucket",
            bucket: "profit",
          },
        ],
      },
    ],
  };
}

module.exports = {
  FORBIDDEN_KO,
  clampPaging,
  isDecimalString,
  decideJournalAccess,
  toUserJournalView,
  listJournalsForUser,
  getJournalForUser,
  fixtureStore,
};
