/**
 * 운영자 회원 검색·상세. 확정 UUID · 페이지네이션 · 최소 PII · 404.
 * /me/membership 을 관리자 목록으로 쓰지 않는다.
 */
"use strict";

const { assertExactUserId, resolveExactMember360, maskPii } = require("./member-360.core.cjs");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function unready(detail) {
  return {
    ok: false,
    applied: false,
    code: "STORE_UNREADY",
    httpStatus: 503,
    detail: detail || "users_directory_unready",
  };
}

function projectPublicRow(row) {
  return {
    userId: row.userId,
    membership: row.membership || null,
    resellerId: row.resellerId || row.referralCode || null,
    emailMasked: row.email ? maskPii(row.email) : null,
    phoneMasked: row.phone ? maskPii(row.phone) : null,
  };
}

function decodeCursor(raw) {
  if (raw == null || raw === "") return 0;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) {
    const err = new Error("cursor must be a non-negative integer");
    err.code = "INVALID_CURSOR";
    throw err;
  }
  return n;
}

/**
 * @param {{ q?: unknown, cursor?: unknown, limit?: unknown }} input
 * @param {{ ready?: boolean, listPage?: Function, findById?: Function }} store
 */
async function searchMembers(input, store) {
  if (!store || store.ready !== true) {
    return unready("users_directory_unready");
  }
  const q = String((input && input.q) || "").trim();
  if (q && !UUID_RE.test(q)) {
    return { ok: false, applied: false, code: "INVALID_USER", httpStatus: 400 };
  }
  let offset = 0;
  try {
    offset = decodeCursor(input && input.cursor);
  } catch (e) {
    return { ok: false, applied: false, code: e.code || "INVALID_CURSOR", httpStatus: 400 };
  }
  const limitRaw = Number((input && input.limit) || 20);
  const limit = Number.isInteger(limitRaw) && limitRaw > 0 && limitRaw <= 50 ? limitRaw : 20;

  if (q) {
    const requested = assertExactUserId(q);
    const found = store.findById ? await store.findById(requested) : null;
    const resolved = resolveExactMember360({
      requestedUserId: requested,
      foundUserId: found && found.userId,
    });
    if (!resolved.ok) {
      return {
        ok: false,
        applied: false,
        code: resolved.code,
        httpStatus: resolved.status,
        userId: requested,
        substituted: false,
      };
    }
    return {
      ok: true,
      applied: false,
      httpStatus: 200,
      items: [projectPublicRow(found)],
      nextCursor: null,
      exact: true,
    };
  }

  if (typeof store.listPage !== "function") {
    return unready("users_list_unready");
  }
  const page = await store.listPage({ offset, limit });
  const items = (page.items || []).map(projectPublicRow);
  return {
    ok: true,
    applied: false,
    httpStatus: 200,
    items,
    nextCursor: page.nextOffset != null ? String(page.nextOffset) : null,
    exact: false,
  };
}

function createUnreadyMemberStore() {
  return { ready: false, kind: "unready" };
}

function createMemoryMemberStore(rows) {
  const list = Array.isArray(rows) ? rows.slice() : [];
  return {
    ready: true,
    kind: "test_memory",
    testOnly: true,
    async findById(id) {
      return list.find((r) => r.userId === id) || null;
    },
    async listPage({ offset, limit }) {
      const slice = list.slice(offset, offset + limit);
      const nextOffset = offset + limit < list.length ? offset + limit : null;
      return { items: slice, nextOffset };
    },
  };
}

module.exports = {
  searchMembers,
  projectPublicRow,
  createUnreadyMemberStore,
  createMemoryMemberStore,
};
