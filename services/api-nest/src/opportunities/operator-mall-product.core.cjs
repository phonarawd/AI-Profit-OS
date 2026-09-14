/**
 * 운영자 쇼핑몰형 공용 상품 + 회원별 참여·지급 (로컬 코어).
 * 외부 eBay/Amazon 파싱·새 매칭 엔진 없음. S1 legacy writer 보호를 풀지 않는다.
 * 실 Postgres persist / 운영 DDL 아님. STORE_UNREADY 를 성공으로 바꾸지 않는다.
 */
"use strict";

const crypto = require("node:crypto");
const path = require("node:path");
const { projectMoneyAuthority, rejectClientPayoutAuthority } = require(
  path.join(__dirname, "..", "ledger", "money-authority.core.cjs"),
);

const VISIBILITY = Object.freeze({
  ALL_PUBLIC: "all_public",
  SELECTED_MEMBERS: "selected_members",
  PRIVATE: "private",
});

const PAYOUT_STATUS = Object.freeze({
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  BLOCKED: "blocked",
});

const CURRENCY_USDT = "USDT";
const AMOUNT_MAX_LEN = 80;
const SCALE = 18;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function unready(detail) {
  return {
    ok: false,
    applied: false,
    code: "STORE_UNREADY",
    httpStatus: 503,
    detail: detail || "operator_mall_store_unready",
  };
}

function fail(code, httpStatus, extra) {
  return Object.assign(
    { ok: false, applied: false, code, httpStatus },
    extra || {},
  );
}

function isDecimalAmount(raw) {
  if (typeof raw !== "string") return false;
  const n = raw.length;
  if (n < 1 || n > AMOUNT_MAX_LEN) return false;
  let i = 0;
  if (raw.charCodeAt(0) === 45) {
    if (n === 1) return false;
    i = 1;
  }
  let digits = 0;
  let frac = 0;
  let dot = false;
  for (; i < n; i += 1) {
    const c = raw.charCodeAt(i);
    if (c >= 48 && c <= 57) {
      if (dot) frac += 1;
      else digits += 1;
      continue;
    }
    if (c === 46 && !dot && digits > 0) {
      dot = true;
      continue;
    }
    return false;
  }
  if (digits < 1) return false;
  if (dot && frac < 1) return false;
  return true;
}

function parseAmount(raw) {
  if (!isDecimalAmount(raw)) throw new Error(`invalid amount: ${raw}`);
  const neg = raw.startsWith("-");
  const body = neg ? raw.slice(1) : raw;
  const [wholePart, fracPart = ""] = body.split(".");
  if (fracPart.length > SCALE) throw new Error(`amount scale > ${SCALE}`);
  const padded = (fracPart + "0".repeat(SCALE)).slice(0, SCALE);
  const scaled = BigInt(wholePart + padded);
  return neg ? -scaled : scaled;
}

function formatAmount(n) {
  const neg = n < 0n;
  const abs = neg ? -n : n;
  const s = abs.toString().padStart(SCALE + 1, "0");
  const whole = s.slice(0, -SCALE) || "0";
  let frac = s.slice(-SCALE);
  while (frac.endsWith("0")) frac = frac.slice(0, -1);
  const body = frac.length ? `${whole}.${frac}` : whole;
  return neg ? `-${body}` : body;
}

function assertPayoutAmount(raw, field) {
  const name = field || "payoutAmount";
  if (typeof raw !== "string" || !isDecimalAmount(raw)) {
    const err = new Error(`${name} must be decimal string`);
    err.code = "INVALID_AMOUNT";
    throw err;
  }
  const n = parseAmount(raw);
  if (n <= 0n) {
    const err = new Error(`${name} must be > 0`);
    err.code = "INVALID_AMOUNT";
    throw err;
  }
  return formatAmount(n);
}

function assertUuid(raw, field) {
  const s = String(raw || "").trim().toLowerCase();
  if (!UUID_RE.test(s)) {
    const err = new Error(`${field || "id"} must be uuid`);
    err.code = "INVALID_ID";
    throw err;
  }
  return s;
}

function assertVisibility(raw) {
  const v = String(raw || VISIBILITY.ALL_PUBLIC);
  if (!Object.values(VISIBILITY).includes(v)) {
    const err = new Error("visibility invalid");
    err.code = "INVALID_VISIBILITY";
    throw err;
  }
  return v;
}

function normalizeMemberIds(raw) {
  if (raw == null) return [];
  if (!Array.isArray(raw)) {
    const err = new Error("selectedMemberIds must be uuid[]");
    err.code = "INVALID_SELECTED_MEMBERS";
    throw err;
  }
  const out = [];
  const seen = new Set();
  for (const item of raw) {
    const id = assertUuid(item, "selectedMemberId");
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

function assertCompositionQty(raw) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    const err = new Error("compositionQty must be integer >= 1");
    err.code = "INVALID_COMPOSITION_QTY";
    throw err;
  }
  return n;
}

const MEMO_MAX = 2000;

function assertPriceConfirmationMemo(raw) {
  if (raw == null || raw === "") return "";
  if (typeof raw !== "string") {
    const err = new Error("priceConfirmationMemo must be string");
    err.code = "INVALID_PRICE_CONFIRMATION_MEMO";
    throw err;
  }
  const s = raw.trim();
  if (s.length > MEMO_MAX) {
    const err = new Error("priceConfirmationMemo too long");
    err.code = "INVALID_PRICE_CONFIRMATION_MEMO";
    throw err;
  }
  return s;
}

/**
 * 진행 중 슬롯은 회원별. 상품 전체 독점·판매 재고가 아니다.
 * compositionQty 는 구성 수량. 원장 FOR UPDATE 는 여기 없음.
 */
function countMemberInFlight(rows, opportunityId, userId) {
  return (rows || []).filter(
    (r) =>
      r.opportunityId === opportunityId &&
      r.userId === userId &&
      (r.status === "running" || r.status === "requeue"),
  ).length;
}

function canSeeProduct(product, userId) {
  if (!product || product.visibility === VISIBILITY.PRIVATE) return false;
  if (product.visibility === VISIBILITY.ALL_PUBLIC) return true;
  return (product.selectedMemberIds || []).includes(userId);
}

function personalGuard(member) {
  if (!member) return { blocked: true, code: "MEMBER_NOT_FOUND" };
  if (member.suspended === true || member.matchBlocked === true) {
    return { blocked: true, code: "MATCH_BLOCKED" };
  }
  const cap = Number(member.cap);
  if (Number.isInteger(cap) && cap === 0) {
    return { blocked: true, code: "DAILY_MATCH_CAP" };
  }
  const used = Number(member.dailyUsed || 0);
  if (Number.isInteger(cap) && cap > 0 && used >= cap) {
    return { blocked: true, code: "DAILY_MATCH_CAP" };
  }
  return { blocked: false };
}

function requireReadyStore(store) {
  if (!store || store.ready !== true) return unready();
  return null;
}

function requireOperator(input) {
  if (!input || !input.operatorId) {
    return fail("ADMIN_AUTH_REQUIRED", 401);
  }
  try {
    assertUuid(input.operatorId, "operatorId");
  } catch (e) {
    return fail(e.code || "ADMIN_AUTH_REQUIRED", 401);
  }
  if (input.unauthenticated === true || input.skipAuth === true) {
    return fail("ADMIN_AUTH_REQUIRED", 401);
  }
  return null;
}

function validateProductFields(input) {
  const name = String((input && input.name) || "").trim();
  if (!name) {
    const err = new Error("name required");
    err.code = "INVALID_NAME";
    throw err;
  }
  const description = String((input && input.description) || "").trim();
  const photos = Array.isArray(input && input.photos)
    ? input.photos.map((p) => String(p || "").trim()).filter(Boolean)
    : [];
  const compositionQty = assertCompositionQty(input && input.compositionQty);
  const payoutAmount = assertPayoutAmount(input && input.payoutAmount, "payoutAmount");
  const currency = String((input && input.currency) || CURRENCY_USDT);
  if (currency !== CURRENCY_USDT) {
    const err = new Error("currency must be USDT");
    err.code = "INVALID_CURRENCY";
    throw err;
  }
  const visibility = assertVisibility(input && input.visibility);
  const selectedMemberIds =
    visibility === VISIBILITY.SELECTED_MEMBERS
      ? normalizeMemberIds(input && input.selectedMemberIds)
      : [];
  if (visibility === VISIBILITY.SELECTED_MEMBERS && selectedMemberIds.length < 1) {
    const err = new Error("selectedMemberIds required");
    err.code = "INVALID_SELECTED_MEMBERS";
    throw err;
  }
  const priceConfirmationMemo = assertPriceConfirmationMemo(
    input && input.priceConfirmationMemo,
  );
  return {
    name,
    description,
    photos,
    compositionQty,
    payoutAmount,
    currency,
    visibility,
    selectedMemberIds,
    priceConfirmationMemo,
  };
}

function assertIdempotencyKey(raw) {
  const key = String(raw || "").trim();
  if (!key || key.length > 200) {
    const err = new Error("idempotencyKey required");
    err.code = "IDEMPOTENCY_REQUIRED";
    throw err;
  }
  return key;
}

function assertExpectedRevision(raw) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    const err = new Error("expectedRevision required");
    err.code = "EXPECTED_REVISION_REQUIRED";
    throw err;
  }
  return n;
}

async function registerProduct(input, deps) {
  const blocked = requireReadyStore(deps && deps.store) || requireOperator(input);
  if (blocked) return blocked;
  const actorKind = input.actorKind === "ai_tool" ? "ai_tool" : "admin";
  let fields;
  let idempotencyKey;
  try {
    fields = validateProductFields(input);
    idempotencyKey = assertIdempotencyKey(input && input.idempotencyKey);
  } catch (e) {
    return fail(e.code || "VALIDATION_ERROR", 400, { message: e.message });
  }
  if (typeof deps.store.findProductByRegisterKey === "function") {
    const existing = await deps.store.findProductByRegisterKey(idempotencyKey);
    if (existing) {
      return {
        ok: true,
        applied: false,
        replay: true,
        httpStatus: 200,
        product: existing,
      };
    }
  }
  const now = (deps.now && deps.now()) || new Date().toISOString();
  const product = {
    id: crypto.randomUUID(),
    ...fields,
    revision: 1,
    registerIdempotencyKey: idempotencyKey,
    supplySource: "operator",
    compositionIsNotSellableStock: true,
    createdAt: now,
    updatedAt: now,
  };
  try {
    if (typeof deps.store.insertProduct === "function") {
      const inserted = await deps.store.insertProduct(product);
      if (inserted && inserted.id && inserted.id !== product.id) {
        return {
          ok: true,
          applied: false,
          replay: true,
          httpStatus: 200,
          product: inserted,
        };
      }
    } else {
      await deps.store.saveProduct(product);
    }
  } catch (e) {
    if (e && e.code === "23505" && typeof deps.store.findProductByRegisterKey === "function") {
      const replay = await deps.store.findProductByRegisterKey(idempotencyKey);
      if (replay) {
        return {
          ok: true,
          applied: false,
          replay: true,
          httpStatus: 200,
          product: replay,
        };
      }
    }
    throw e;
  }
  await deps.store.appendAudit({
    actorId: String(input.operatorId).toLowerCase(),
    actorKind,
    action: "product.register",
    productId: product.id,
    revision: 1,
    at: now,
  });
  return { ok: true, applied: true, httpStatus: 201, product };
}

async function updateProduct(productId, input, deps) {
  const blocked = requireReadyStore(deps && deps.store) || requireOperator(input);
  if (blocked) return blocked;
  const actorKind = input.actorKind === "ai_tool" ? "ai_tool" : "admin";
  const id = assertUuid(productId, "productId");
  const current = await deps.store.getProduct(id);
  if (!current) return fail("PRODUCT_NOT_FOUND", 404);
  let expectedRevision;
  try {
    expectedRevision = assertExpectedRevision(input && input.expectedRevision);
  } catch (e) {
    return fail(e.code || "EXPECTED_REVISION_REQUIRED", 400, { message: e.message });
  }
  if (expectedRevision !== Number(current.revision)) {
    return fail("REVISION_CONFLICT", 409, {
      currentRevision: current.revision,
      expectedRevision,
    });
  }
  let patch = {};
  try {
    const merged = {
      name: input.name != null ? input.name : current.name,
      description: input.description != null ? input.description : current.description,
      photos: input.photos != null ? input.photos : current.photos,
      compositionQty:
        input.compositionQty != null ? input.compositionQty : current.compositionQty,
      payoutAmount: input.payoutAmount != null ? input.payoutAmount : current.payoutAmount,
      currency: input.currency != null ? input.currency : current.currency,
      visibility: input.visibility != null ? input.visibility : current.visibility,
      selectedMemberIds:
        input.selectedMemberIds != null
          ? input.selectedMemberIds
          : current.selectedMemberIds,
      priceConfirmationMemo:
        input.priceConfirmationMemo != null
          ? input.priceConfirmationMemo
          : current.priceConfirmationMemo,
    };
    patch = validateProductFields(merged);
  } catch (e) {
    return fail(e.code || "VALIDATION_ERROR", 400, { message: e.message });
  }
  const now = (deps.now && deps.now()) || new Date().toISOString();
  const next = {
    ...current,
    ...patch,
    revision: current.revision + 1,
    updatedAt: now,
  };
  if (typeof deps.store.updateProductIfRevision === "function") {
    const applied = await deps.store.updateProductIfRevision(
      id,
      expectedRevision,
      next,
    );
    if (applied !== true) {
      const latest = await deps.store.getProduct(id);
      return fail("REVISION_CONFLICT", 409, {
        currentRevision: latest ? latest.revision : current.revision,
        expectedRevision,
      });
    }
  } else {
    await deps.store.saveProduct(next);
  }
  await deps.store.appendAudit({
    actorId: String(input.operatorId).toLowerCase(),
    actorKind,
    action: "product.update",
    productId: id,
    revision: next.revision,
    at: now,
  });
  return { ok: true, applied: true, httpStatus: 200, product: next };
}

function projectAdminProduct(product) {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    photos: Array.isArray(product.photos) ? product.photos.slice() : [],
    compositionQty: product.compositionQty,
    payoutAmount: product.payoutAmount,
    currency: product.currency,
    visibility: product.visibility,
    selectedMemberIds: Array.isArray(product.selectedMemberIds)
      ? product.selectedMemberIds.slice()
      : [],
    priceConfirmationMemo: product.priceConfirmationMemo || "",
    revision: product.revision,
    supplySource: "operator",
    registerIdempotencyKey: product.registerIdempotencyKey || null,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function decodePageCursor(raw) {
  if (raw == null || raw === "") return 0;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) {
    const err = new Error("cursor must be a non-negative integer");
    err.code = "INVALID_CURSOR";
    throw err;
  }
  return n;
}

async function adminListProducts(input, deps) {
  const blocked = requireReadyStore(deps && deps.store) || requireOperator(input);
  if (blocked) return blocked;
  let offset = 0;
  try {
    offset = decodePageCursor(input && input.cursor);
  } catch (e) {
    return fail(e.code || "INVALID_CURSOR", 400, { message: e.message });
  }
  const limitRaw = Number((input && input.limit) || 20);
  const limit = Number.isInteger(limitRaw) && limitRaw > 0 && limitRaw <= 50 ? limitRaw : 20;
  let visibility = null;
  if (input && input.visibility) {
    try {
      visibility = assertVisibility(input.visibility);
    } catch (e) {
      return fail(e.code || "INVALID_VISIBILITY", 400, { message: e.message });
    }
  }
  let page;
  if (typeof deps.store.listProductsPage === "function") {
    page = await deps.store.listProductsPage({ offset, limit, visibility });
  } else {
    const all = await deps.store.listProducts();
    const filtered = visibility
      ? all.filter((p) => p.visibility === visibility)
      : all;
    const slice = filtered.slice(offset, offset + limit);
    page = {
      items: slice,
      nextOffset: offset + limit < filtered.length ? offset + limit : null,
    };
  }
  return {
    ok: true,
    applied: true,
    httpStatus: 200,
    items: (page.items || []).map(projectAdminProduct),
    nextCursor: page.nextOffset != null ? String(page.nextOffset) : null,
  };
}

async function adminGetProduct(productId, input, deps) {
  const blocked = requireReadyStore(deps && deps.store) || requireOperator(input);
  if (blocked) return blocked;
  const id = assertUuid(productId, "productId");
  const product = await deps.store.getProduct(id);
  if (!product) return fail("PRODUCT_NOT_FOUND", 404);
  return {
    ok: true,
    applied: true,
    httpStatus: 200,
    product: projectAdminProduct(product),
  };
}

function projectPublicProduct(product) {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    photos: product.photos.slice(),
    compositionQty: product.compositionQty,
    currency: product.currency,
    visibility: product.visibility,
    revision: product.revision,
    moneyAuthority: projectMoneyAuthority({
      expectedProfitUsdt: null,
      configuredPayoutUsdt: product.payoutAmount,
    }),
  };
}

async function listForUser(userId, deps) {
  const blocked = requireReadyStore(deps && deps.store);
  if (blocked) return blocked;
  const uid = assertUuid(userId, "userId");
  const all = await deps.store.listProducts();
  const items = all.filter((p) => canSeeProduct(p, uid)).map(projectPublicProduct);
  return { ok: true, applied: true, httpStatus: 200, items };
}

async function getForUser(userId, productId, deps) {
  const blocked = requireReadyStore(deps && deps.store);
  if (blocked) return blocked;
  const uid = assertUuid(userId, "userId");
  const pid = assertUuid(productId, "productId");
  const product = await deps.store.getProduct(pid);
  if (!product || !canSeeProduct(product, uid)) {
    return fail("PRODUCT_NOT_FOUND", 404);
  }
  return { ok: true, applied: true, httpStatus: 200, product: projectPublicProduct(product) };
}

async function participate(input, deps) {
  const blocked = requireReadyStore(deps && deps.store);
  if (blocked) return blocked;
  const clientBlock = rejectClientPayoutAuthority(input);
  if (clientBlock) return clientBlock;
  if (input && input.payoutAmount != null) {
    return fail("PAYOUT_AMOUNT_TAMPER", 400);
  }
  const userId = assertUuid(input.userId, "userId");
  const productId = assertUuid(input.productId, "productId");
  const idempotencyKey = String((input && input.idempotencyKey) || "").trim();
  if (!idempotencyKey) return fail("IDEMPOTENCY_REQUIRED", 400);

  const product = await deps.store.getProduct(productId);
  if (!product || !canSeeProduct(product, userId)) {
    return fail("PRODUCT_NOT_FOUND", 404);
  }

  const member = deps.store.getMember
    ? await deps.store.getMember(userId)
    : { userId, dailyUsed: 0, cap: 5 };
  const guard = personalGuard(member);
  if (guard.blocked) return fail(guard.code, 403);

  const existing = await deps.store.findParticipationByIdempotency(userId, idempotencyKey);
  if (existing) {
    return {
      ok: true,
      applied: false,
      replay: true,
      httpStatus: 200,
      participation: existing,
      moneyAuthority: projectMoneyAuthority({
        configuredPayoutUsdt: existing.snapshot && existing.snapshot.payoutAmount,
        ledgerJournalId: existing.journalId,
        ledgerPaidUsdt: existing.payoutStatus === PAYOUT_STATUS.PAID ? existing.snapshot.payoutAmount : null,
      }),
    };
  }

  const now = (deps.now && deps.now()) || new Date().toISOString();
  const participation = {
    id: crypto.randomUUID(),
    userId,
    productId,
    idempotencyKey,
    status: "accepted",
    payoutStatus: PAYOUT_STATUS.PENDING,
    snapshot: {
      productRevision: product.revision,
      payoutAmount: product.payoutAmount,
      currency: product.currency,
      visibility: product.visibility,
      compositionQty: product.compositionQty,
    },
    journalId: null,
    createdAt: now,
  };
  await deps.store.saveParticipation(participation);
  if (deps.store.incrementDailyUsed) {
    await deps.store.incrementDailyUsed(userId);
  }
  return {
    ok: true,
    applied: true,
    httpStatus: 201,
    participation,
    moneyAuthority: projectMoneyAuthority({
      configuredPayoutUsdt: product.payoutAmount,
    }),
  };
}

async function applyMatchSuccessPayout(input, deps) {
  const blocked = requireReadyStore(deps && deps.store);
  if (blocked) return blocked;
  const participationId = assertUuid(input.participationId, "participationId");
  const participation = await deps.store.getParticipation(participationId);
  if (!participation) return fail("PARTICIPATION_NOT_FOUND", 404);
  if (input && input.clientPayoutAmount != null) {
    return fail("PAYOUT_AMOUNT_TAMPER", 400);
  }
  if (input && input.clientResultCode != null) {
    return fail("CLIENT_RESULT_REJECTED", 400);
  }

  const evaluator = deps.evaluator;
  if (!evaluator || typeof evaluator.evaluate !== "function") {
    return {
      ok: false,
      applied: false,
      code: "PAYOUT_CONDITION_UNAPPROVED",
      httpStatus: 503,
      payoutStatus: PAYOUT_STATUS.BLOCKED,
      note: "MATCH_SUCCESS 는 settlement_rule 서버 평가만. 임의 mall-complete 조건 없음.",
    };
  }
  const resultCode = evaluator.evaluate(participation);
  if (resultCode !== "MATCH_SUCCESS") {
    return fail("PAYOUT_NOT_READY", 409, {
      payoutStatus: PAYOUT_STATUS.PENDING,
      resultCode,
    });
  }
  if (!participation.snapshot || !participation.snapshot.payoutAmount) {
    return fail("SNAPSHOT_MISSING", 409);
  }
  if (deps.requireFx === true && !participation.snapshot.fxSnapshotId && !input.fxSnapshotId) {
    return {
      ok: false,
      applied: false,
      code: "FX_SNAPSHOT_MISSING",
      httpStatus: 503,
      payoutStatus: PAYOUT_STATUS.BLOCKED,
    };
  }

  const idempotencyKey = `settlement:${participation.id}`;
  const replay = await deps.store.findJournal(idempotencyKey);
  if (replay) {
    return {
      ok: true,
      applied: false,
      replay: true,
      httpStatus: 200,
      payoutStatus: PAYOUT_STATUS.PAID,
      journalId: replay.id,
      participation,
      moneyAuthority: projectMoneyAuthority({
        configuredPayoutUsdt: participation.snapshot.payoutAmount,
        ledgerJournalId: replay.id,
        ledgerPaidUsdt: replay.amountUsdt,
      }),
    };
  }

  const amount = participation.snapshot.payoutAmount;
  const pool = deps.store.getPoolBalance ? await deps.store.getPoolBalance() : null;
  if (pool != null && parseAmount(pool) < parseAmount(amount)) {
    return fail("INSUFFICIENT_SOURCE", 409, { payoutStatus: PAYOUT_STATUS.FAILED });
  }

  const journal = {
    id: crypto.randomUUID(),
    idempotencyKey,
    journalType: "settlement",
    referenceType: "participation",
    referenceId: participation.id,
    userId: participation.userId,
    amountUsdt: amount,
    bucket: "profit",
    createdAt: (deps.now && deps.now()) || new Date().toISOString(),
  };
  const saved = await deps.store.saveJournal(journal);
  const savedId = saved && (saved.id || saved.journalId);
  if (savedId && String(savedId) !== String(journal.id)) {
    return {
      ok: true,
      applied: false,
      replay: true,
      httpStatus: 200,
      payoutStatus: PAYOUT_STATUS.PAID,
      journalId: String(savedId),
      participation,
      moneyAuthority: projectMoneyAuthority({
        configuredPayoutUsdt: amount,
        ledgerJournalId: String(savedId),
        ledgerPaidUsdt: saved.amountUsdt || saved.amount_usdt || amount,
      }),
    };
  }
  const paid = {
    ...participation,
    payoutStatus: PAYOUT_STATUS.PAID,
    journalId: journal.id,
    status: "success",
  };
  await deps.store.saveParticipation(paid);
  return {
    ok: true,
    applied: true,
    httpStatus: 200,
    payoutStatus: PAYOUT_STATUS.PAID,
    journalId: journal.id,
    participation: paid,
    moneyAuthority: projectMoneyAuthority({
      configuredPayoutUsdt: amount,
      ledgerJournalId: journal.id,
      ledgerPaidUsdt: amount,
    }),
  };
}

async function listPayoutsForUser(userId, deps) {
  const blocked = requireReadyStore(deps && deps.store);
  if (blocked) return blocked;
  const uid = assertUuid(userId, "userId");
  const items = await deps.store.listJournalsByUser(uid);
  return { ok: true, applied: true, httpStatus: 200, items };
}

async function adminListParticipations(input, deps) {
  const blocked = requireReadyStore(deps && deps.store) || requireOperator(input);
  if (blocked) return blocked;
  const items = await deps.store.listParticipations({
    productId: input.productId ? assertUuid(input.productId, "productId") : null,
    userId: input.userId ? assertUuid(input.userId, "userId") : null,
  });
  return { ok: true, applied: true, httpStatus: 200, items };
}

function createUnreadyMallStore() {
  return { ready: false, kind: "unready" };
}

function createMemoryMallStore(seed) {
  const products = new Map();
  const participations = new Map();
  const journals = new Map();
  const members = new Map();
  const audit = [];
  let poolBalance = (seed && seed.poolBalance) || "1000000";
  for (const m of (seed && seed.members) || []) {
    members.set(m.userId, {
      userId: m.userId,
      dailyUsed: m.dailyUsed || 0,
      cap: m.cap == null ? 5 : m.cap,
      suspended: m.suspended === true,
      matchBlocked: m.matchBlocked === true,
    });
  }
  return {
    ready: true,
    kind: "test_memory",
    testOnly: true,
    async saveProduct(p) {
      products.set(p.id, p);
    },
    async insertProduct(p) {
      if (p.registerIdempotencyKey) {
        for (const cur of products.values()) {
          if (cur.registerIdempotencyKey === p.registerIdempotencyKey) return cur;
        }
      }
      products.set(p.id, p);
      return p;
    },
    async findProductByRegisterKey(key) {
      for (const cur of products.values()) {
        if (cur.registerIdempotencyKey === key) return cur;
      }
      return null;
    },
    async updateProductIfRevision(id, expectedRevision, next) {
      const cur = products.get(id);
      if (!cur || Number(cur.revision) !== Number(expectedRevision)) return false;
      products.set(id, next);
      return true;
    },
    async getProduct(id) {
      return products.get(id) || null;
    },
    async listProducts() {
      return Array.from(products.values());
    },
    async listProductsPage({ offset, limit, visibility }) {
      const all = Array.from(products.values()).filter((p) =>
        visibility ? p.visibility === visibility : true,
      );
      const slice = all.slice(offset, offset + limit);
      return {
        items: slice,
        nextOffset: offset + limit < all.length ? offset + limit : null,
      };
    },
    async saveParticipation(p) {
      participations.set(p.id, p);
    },
    async getParticipation(id) {
      return participations.get(id) || null;
    },
    async findParticipationByIdempotency(userId, key) {
      for (const p of participations.values()) {
        if (p.userId === userId && p.idempotencyKey === key) return p;
      }
      return null;
    },
    async listParticipations(filter) {
      return Array.from(participations.values()).filter((p) => {
        if (filter.productId && p.productId !== filter.productId) return false;
        if (filter.userId && p.userId !== filter.userId) return false;
        return true;
      });
    },
    async getMember(userId) {
      return members.get(userId) || null;
    },
    async incrementDailyUsed(userId) {
      const m = members.get(userId);
      if (m) m.dailyUsed += 1;
    },
    async saveJournal(j) {
      journals.set(j.idempotencyKey, j);
      poolBalance = formatAmount(parseAmount(poolBalance) - parseAmount(j.amountUsdt));
    },
    async findJournal(key) {
      return journals.get(key) || null;
    },
    async listJournalsByUser(userId) {
      return Array.from(journals.values()).filter((j) => j.userId === userId);
    },
    async getPoolBalance() {
      return poolBalance;
    },
    async appendAudit(row) {
      audit.push(row);
    },
    audit,
  };
}

function createMatchSuccessEvaluator() {
  return { evaluate() { return "MATCH_SUCCESS"; } };
}

function createPendingEvaluator() {
  return { evaluate() { return "REQUEUE"; } };
}

module.exports = {
  VISIBILITY,
  PAYOUT_STATUS,
  CURRENCY_USDT,
  parseAmount,
  formatAmount,
  assertPayoutAmount,
  assertPriceConfirmationMemo,
  canSeeProduct,
  countMemberInFlight,
  personalGuard,
  registerProduct,
  updateProduct,
  adminListProducts,
  adminGetProduct,
  projectAdminProduct,
  listForUser,
  getForUser,
  participate,
  applyMatchSuccessPayout,
  listPayoutsForUser,
  adminListParticipations,
  createUnreadyMallStore,
  createMemoryMallStore,
  createMatchSuccessEvaluator,
  createPendingEvaluator,
  projectPublicProduct,
};
