/**
 * 운영자 비밀번호 검증 + Admin JWT 발급.
 * 기존 jwt.core · Admin 쿠키 교환을 재사용. Supabase Auth / demo 로그인 /
 * 고정 운영 비밀번호 / 사용자 세션으로 Admin 우회 금지.
 * 자격 저장소가 ready 가 아니면 STORE_UNREADY · applied=false.
 */
"use strict";

const jwt = require("./jwt.core.cjs");

const ADMIN_JWT_ISSUER = "ai-profit-os-admin";
const ADMIN_JWT_AUDIENCE = "aipo-ops";
const USER_JWT_ISSUER = "ai-profit-os-nest";

function unready(detail) {
  return {
    ok: false,
    applied: false,
    code: "STORE_UNREADY",
    httpStatus: 503,
    detail: detail || "staff_store_unready",
  };
}

function deny(code, httpStatus, reason) {
  return { ok: false, applied: false, code, httpStatus, reason: reason || null };
}

/**
 * @param {{
 *   email?: unknown,
 *   password?: unknown,
 *   userAccessToken?: unknown,
 * }} input
 * @param {{
 *   store?: { ready?: boolean, findByEmail?: (email: string) => Promise<object|null>|object|null },
 *   opsDb?: { query: Function, configured?: () => boolean },
 *   verifyPassword: (plain: string, encoded: string) => Promise<boolean>,
 *   adminJwtSecret?: string,
 * }} deps
 */
async function loginStaff(input, deps) {
  let store = deps && deps.store;
  const placeholder = !store || store.kind === "unready";
  const explicitUnready =
    store &&
    store.ready !== true &&
    store.kind &&
    store.kind !== "unready";
  if (explicitUnready) {
    return unready(store.detail || "staff_store_unready");
  }
  if (placeholder || store.ready !== true || typeof store.findByEmail !== "function") {
    const persist = require("./admin-staff-login.persist.cjs");
    const resolved = await persist.resolveRuntimeStaffStore(process.env, {
      opsDb: deps && deps.opsDb,
    });
    if (resolved && resolved.ready === true && typeof resolved.findByEmail === "function") {
      store = resolved;
    } else {
      return unready((resolved && resolved.detail) || "staff_store_unready");
    }
  }
  if (input && input.userAccessToken) {
    return deny("ADMIN_AUTH_INVALID", 401, "user_session_rejected");
  }
  const email = String((input && input.email) || "")
    .trim()
    .toLowerCase();
  const password = String((input && input.password) || "");
  if (!email || !password) {
    return deny("ADMIN_AUTH_REQUIRED", 401, "credentials_required");
  }

  const staff = await store.findByEmail(email);
  if (!staff || !staff.adminId || !staff.passwordHash || staff.status === "disabled") {
    if (typeof deps.verifyPassword === "function") {
      await deps.verifyPassword(password, (staff && staff.passwordHash) || "unusable");
    }
    return deny("ADMIN_AUTH_INVALID", 401, "staff_not_found_or_disabled");
  }
  const passwordOk = await deps.verifyPassword(password, staff.passwordHash);
  if (passwordOk !== true) {
    return deny("ADMIN_AUTH_INVALID", 401, "password_mismatch");
  }
  const secret = String((deps && deps.adminJwtSecret) || "");
  if (secret.length < 32) {
    return {
      ok: false,
      applied: false,
      code: "ADMIN_AUTH_NOT_CONFIGURED",
      httpStatus: 503,
    };
  }
  const token = jwt.sign(
    { sub: String(staff.adminId), role: String(staff.role || "cs") },
    secret,
    {
      issuer: ADMIN_JWT_ISSUER,
      audience: ADMIN_JWT_AUDIENCE,
      expiresInSec: 15 * 60,
    },
  );
  const claims = jwt.verify(token, secret, {
    issuer: ADMIN_JWT_ISSUER,
    audience: ADMIN_JWT_AUDIENCE,
  });
  if (claims.iss === USER_JWT_ISSUER) {
    return deny("ADMIN_AUTH_INVALID", 401, "user_issuer_rejected");
  }
  return {
    ok: true,
    applied: true,
    code: "OK",
    httpStatus: 200,
    adminId: String(staff.adminId),
    role: String(staff.role || "cs"),
    token,
  };
}

function createUnreadyStaffStore() {
  return { ready: false, kind: "unready" };
}

function createMemoryStaffStore(rows) {
  const list = Array.isArray(rows) ? rows.slice() : [];
  return {
    ready: true,
    kind: "test_memory",
    testOnly: true,
    async findByEmail(email) {
      const key = String(email || "")
        .trim()
        .toLowerCase();
      return list.find((r) => r.email === key) || null;
    },
  };
}

module.exports = {
  ADMIN_JWT_ISSUER,
  ADMIN_JWT_AUDIENCE,
  USER_JWT_ISSUER,
  loginStaff,
  createUnreadyStaffStore,
  createMemoryStaffStore,
};
