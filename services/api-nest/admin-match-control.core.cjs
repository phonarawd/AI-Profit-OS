/**
 * REL-223 Allocation / Manual Match + Bulk/Schedule/Campaign.
 * 허용 동사만. 원장 편집 동사 0. bulk는 preview 카운트 필수.
 * LIVE apply 는 preview + confirm 없이 persist 0.
 */
"use strict";

const path = require("path");
const opsCore = require(path.join(__dirname, "admin-ops.core.cjs"));

const MATCH_VERBS = Object.freeze([
  "ALLOW",
  "BLOCK",
  "PAUSE",
  "CANCEL",
  "REASSIGN",
]);
const MATCH_VERB_SET = new Set(MATCH_VERBS);
const MATCH_KINDS = Object.freeze(["match", "bulk", "schedule", "campaign"]);
const MATCH_KIND_SET = new Set(MATCH_KINDS);
const FORBIDDEN_VERBS = Object.freeze([
  "CREDIT",
  "DEBIT",
  "ADJUST",
  "BALANCE_PATCH",
  "LEDGER_EDIT",
  "FORCE_SETTLE",
  "WALLET_TOPUP",
]);
const FORBIDDEN_VERB_SET = new Set(FORBIDDEN_VERBS);
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeVerb(raw) {
  const verb = String(raw || "").trim();
  if (!verb) return { ok: false, error: "MATCH_VERB_REQUIRED" };
  if (FORBIDDEN_VERB_SET.has(verb)) {
    return { ok: false, error: "MATCH_VERB_LEDGER_FORBIDDEN" };
  }
  if (!MATCH_VERB_SET.has(verb)) {
    return { ok: false, error: "MATCH_VERB_UNKNOWN" };
  }
  return { ok: true, verb };
}

function normalizeKind(raw) {
  const kind = String(raw || "").trim();
  if (!MATCH_KIND_SET.has(kind)) {
    return { ok: false, error: "MATCH_KIND_UNKNOWN" };
  }
  return { ok: true, kind };
}

function requireImpact(kindRaw, impactCountRaw) {
  const kind = normalizeKind(kindRaw);
  if (!kind.ok) return kind;
  const n = Number(impactCountRaw);
  if (kind.kind === "match") {
    const impactCount = Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
    return { ok: true, kind: kind.kind, impactCount };
  }
  if (impactCountRaw == null || impactCountRaw === "" || !Number.isFinite(n) || n < 1) {
    return { ok: false, error: "BULK_PREVIEW_REQUIRED" };
  }
  return { ok: true, kind: kind.kind, impactCount: Math.floor(n) };
}

function requireReassignTarget(verb, targetIdRaw) {
  if (verb !== "REASSIGN") return { ok: true, targetId: null };
  const targetId = String(targetIdRaw || "").trim();
  if (!UUID_RE.test(targetId)) {
    return { ok: false, error: "REASSIGN_TARGET_REQUIRED" };
  }
  return { ok: true, targetId };
}

/**
 * @param {{ mode?: unknown, confirmed?: boolean, stage?: string, previewed?: boolean }} input
 */
function decideMatchWrite(input) {
  const body = input && typeof input === "object" ? input : {};
  const base = opsCore.decideWrite({
    mode: body.mode,
    confirmed: body.confirmed,
    stage: body.stage,
  });
  if (!base.ok) return base;
  if (base.mode === "LIVE" && body.stage === "apply" && body.previewed !== true) {
    return {
      ok: false,
      error: "PREVIEW_REQUIRED",
      persist: false,
      ledgerWrite: false,
      isolated: false,
      mode: "LIVE",
    };
  }
  return {
    ...base,
    ledgerWrite: false,
  };
}

module.exports = {
  MATCH_VERBS,
  MATCH_KINDS,
  FORBIDDEN_VERBS,
  normalizeVerb,
  normalizeKind,
  requireImpact,
  requireReassignTarget,
  decideMatchWrite,
  requireReason: opsCore.requireReason,
};
