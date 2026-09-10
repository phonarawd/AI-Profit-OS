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

const JOURNAL_DISPLAY = {
  deposit_usdt: { displayKey: "ledger.deposit_usdt", labelKo: "USDT 입금", direction: "credit" },
  deposit_krw: { displayKey: "ledger.deposit_krw", labelKo: "원화 입금", direction: "credit" },
  withdraw: { displayKey: "ledger.withdraw", labelKo: "출금", direction: "debit" },
  withdraw_refund: { displayKey: "ledger.withdraw_refund", labelKo: "출금 반환", direction: "credit" },
  participate_lock: { displayKey: "ledger.participate_lock", labelKo: "참여 잠금", direction: "debit" },
  participate_unlock: { displayKey: "ledger.participate_unlock", labelKo: "잠금 해제", direction: "credit" },
  settlement: { displayKey: "ledger.settlement", labelKo: "정산", direction: "credit" },
  merge_profit_to_principal: {
    displayKey: "ledger.merge_profit_to_principal",
    labelKo: "수익 이동",
    direction: "neutral",
  },
  admin_adjust: { displayKey: "ledger.admin_adjust", labelKo: "조정", direction: "neutral" },
  referral_reward: { displayKey: "ledger.referral_reward", labelKo: "초대 혜택", direction: "credit" },
  referral_clawback: { displayKey: "ledger.referral_clawback", labelKo: "초대 조정", direction: "debit" },
  practice_grant: { displayKey: "ledger.practice_grant", labelKo: "연습 지급", direction: "credit" },
  practice_expire: { displayKey: "ledger.practice_expire", labelKo: "연습 만료", direction: "debit" },
  mission_reward: { displayKey: "ledger.mission_reward", labelKo: "미션 혜택", direction: "credit" },
  mission_clawback: { displayKey: "ledger.mission_clawback", labelKo: "미션 조정", direction: "debit" },
  fee: { displayKey: "ledger.fee", labelKo: "수수료", direction: "debit" },
  other: { displayKey: "ledger.unknown", labelKo: "확인 필요", direction: "neutral" },
};

function parseDecimalParts(value) {
  if (!isDecimalString(value)) {
    throw new Error("amountUsdt must be decimal string");
  }
  const neg = value.startsWith("-");
  const raw = neg ? value.slice(1) : value;
  const [whole, frac = ""] = raw.split(".");
  return { neg, whole, frac };
}

function addDecimal(left, right) {
  const a = parseDecimalParts(left);
  const b = parseDecimalParts(right);
  const scale = Math.max(a.frac.length, b.frac.length);
  const toInt = (part) => {
    const n = BigInt(part.whole + part.frac.padEnd(scale, "0"));
    return part.neg ? -n : n;
  };
  const sum = toInt(a) + toInt(b);
  const sign = sum < 0n ? "-" : "";
  const abs = sum < 0n ? -sum : sum;
  if (scale === 0) return sign + abs.toString();
  const padded = abs.toString().padStart(scale + 1, "0");
  const whole = padded.slice(0, -scale);
  const frac = padded.slice(-scale).replace(/0+$/, "");
  return frac ? `${sign}${whole}.${frac}` : sign + whole;
}

function compareDecimal(left, right) {
  const a = parseDecimalParts(left);
  const b = parseDecimalParts(right);
  const scale = Math.max(a.frac.length, b.frac.length);
  const toInt = (part) => {
    const n = BigInt(part.whole + part.frac.padEnd(scale, "0"));
    return part.neg ? -n : n;
  };
  const delta = toInt(a) - toInt(b);
  if (delta > 0n) return 1;
  if (delta < 0n) return -1;
  return 0;
}

function isUserBucketEntry(entry) {
  return Boolean(entry && (entry.bucket || entry.accountKind === "user_bucket"));
}

function netUserAmount(entries) {
  let net = "0";
  for (const entry of entries) {
    if (!isUserBucketEntry(entry)) continue;
    const signed = entry.direction === "debit" ? `-${entry.amountUsdt}` : entry.amountUsdt;
    net = addDecimal(net, signed);
  }
  return net;
}

function customerJournalDisplay(journalType, entries) {
  const known = JOURNAL_DISPLAY[journalType];
  const meta = known || {
    displayKey: "ledger.unknown",
    labelKo: "확인 필요",
    direction: "neutral",
  };
  let amountUsdt = null;
  let amountSource = "unknown";
  let direction = meta.direction;
  try {
    const net = netUserAmount(entries);
    amountUsdt = net.startsWith("-") ? net.slice(1) : net;
    amountSource = "user_bucket_net";
    const cmp = compareDecimal(net, "0");
    if (cmp > 0) direction = "credit";
    else if (cmp < 0) direction = "debit";
    else direction = known ? meta.direction : "neutral";
  } catch {
    amountUsdt = null;
    amountSource = "unknown";
    direction = "neutral";
  }
  return {
    displayKey: meta.displayKey,
    labelKo: meta.labelKo,
    direction,
    customerVisible: true,
    amountUsdt,
    amountSource,
    multiEntryPolicy: "sum_user_bucket_signed",
    status: "posted",
  };
}

function toUserJournalView(journal, requesterUserId) {
  const entries = [];
  for (const entry of journal.entries || []) {
    const mapped = toUserEntry(entry, requesterUserId);
    if (mapped) entries.push(mapped);
  }
  const journalType = String(journal.journalType);
  return {
    id: String(journal.id),
    journalType,
    createdAt: String(journal.createdAt),
    referenceType: journal.referenceType ?? null,
    referenceId: journal.referenceId ?? null,
    display: customerJournalDisplay(journalType, entries),
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
  JOURNAL_DISPLAY,
  clampPaging,
  isDecimalString,
  addDecimal,
  customerJournalDisplay,
  decideJournalAccess,
  toUserJournalView,
  listJournalsForUser,
  getJournalForUser,
  fixtureStore,
};
