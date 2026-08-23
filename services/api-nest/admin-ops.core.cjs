/**
 * REL-222 3-mode Admin Ops — Nest/DB 밖에서도 동일 fixture.
 * LIVE 는 confirm 없이 persist 0. DRY_RUN/SIMULATION 은 원장 persist 0.
 * Preview-As-User 는 유저 JWT 를 만들지 않는다.
 */
"use strict";

const OPS_MODES = Object.freeze(["LIVE", "DRY_RUN", "SIMULATION"]);
const OPS_MODE_SET = new Set(OPS_MODES);
const OPS_STAGES = Object.freeze([
  "preview",
  "confirm",
  "apply",
  "result",
  "rollback",
]);
const OPS_FAMILIES = Object.freeze([
  "policy",
  "bulk",
  "execution_rule",
  "wallet_operation",
  "risk_threshold",
]);
const OPS_FAMILY_SET = new Set(OPS_FAMILIES);
const REASON_MIN = 10;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeMode(raw) {
  if (raw == null || String(raw).trim() === "") {
    return { ok: false, error: "MODE_REQUIRED" };
  }
  const mode = String(raw).trim();
  if (!OPS_MODE_SET.has(mode)) {
    return { ok: false, error: "MODE_UNKNOWN" };
  }
  return { ok: true, mode };
}

function normalizeFamily(raw) {
  const family = String(raw || "").trim();
  if (!OPS_FAMILY_SET.has(family)) {
    return { ok: false, error: "OPS_FAMILY_UNKNOWN" };
  }
  return { ok: true, family };
}

function requireReason(reason) {
  const text = String(reason || "").trim();
  if (text.length < REASON_MIN) {
    return { ok: false, error: "OPS_REASON_MIN" };
  }
  return { ok: true, reason: text };
}

/**
 * @param {{ mode?: unknown, confirmed?: boolean, stage?: string }} input
 */
function decideWrite(input) {
  const body = input && typeof input === "object" ? input : {};
  const modeRes = normalizeMode(body.mode);
  if (!modeRes.ok) {
    return {
      ok: false,
      error: modeRes.error,
      persist: false,
      ledgerWrite: false,
      isolated: false,
    };
  }
  const mode = modeRes.mode;
  const confirmed = body.confirmed === true;
  const stage = String(body.stage || "");

  if (mode === "DRY_RUN") {
    return {
      ok: true,
      mode,
      persist: false,
      ledgerWrite: false,
      isolated: false,
      confirmRequired: false,
    };
  }
  if (mode === "SIMULATION") {
    return {
      ok: true,
      mode,
      persist: false,
      ledgerWrite: false,
      isolated: true,
      confirmRequired: false,
    };
  }
  if (stage === "apply" && confirmed !== true) {
    return {
      ok: false,
      error: "LIVE_CONFIRM_REQUIRED",
      mode,
      persist: false,
      ledgerWrite: false,
      isolated: false,
      confirmRequired: true,
    };
  }
  return {
    ok: true,
    mode,
    persist: stage === "apply" && confirmed === true,
    ledgerWrite: false,
    isolated: false,
    confirmRequired: true,
  };
}

function impactPreview(familyRaw, countRaw) {
  const family = normalizeFamily(familyRaw);
  if (!family.ok) return family;
  const count = Number(countRaw);
  const impactCount = Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0;
  return {
    ok: true,
    family: family.family,
    impactCount,
    persist: false,
    ledgerWrite: false,
  };
}

function previewAsUser(userIdRaw) {
  const userId = String(userIdRaw || "").trim();
  if (!UUID_RE.test(userId)) {
    return { ok: false, error: "PREVIEW_USER_INVALID" };
  }
  return {
    ok: true,
    userId,
    mintUserJwt: false,
    moneyWrite: false,
    scope: "read_profile",
  };
}

function assertNoUserJwt(payload) {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "PREVIEW_USER_INVALID" };
  }
  if (payload.mintUserJwt === true) {
    return { ok: false, error: "PREVIEW_USER_JWT_FORBIDDEN" };
  }
  if (payload.accessToken || payload.refreshToken || payload.token) {
    return { ok: false, error: "PREVIEW_USER_JWT_FORBIDDEN" };
  }
  if (payload.moneyWrite === true) {
    return { ok: false, error: "PREVIEW_USER_MONEY_WRITE_FORBIDDEN" };
  }
  return { ok: true };
}

module.exports = {
  OPS_MODES,
  OPS_STAGES,
  OPS_FAMILIES,
  REASON_MIN,
  normalizeMode,
  normalizeFamily,
  requireReason,
  decideWrite,
  impactPreview,
  previewAsUser,
  assertNoUserJwt,
};
