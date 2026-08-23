/**
 * REL-406 Kill Switch 9종 — Nest/DB 밖에서도 동일 enforce fixture가 돈다.
 *
 * engaged=true 이면 해당 경로 block. UI 토글만 있고 이 함수를 안 타면 EXIT_GATE FAIL.
 * MONEY_CIRCUIT / PUSH_KILL / REFERRAL_ACCRUAL_HALT 는 기존 테이블 선례를 wrap.
 * GROWTH_PAUSE 는 growth_control.enabled 기본 OFF 와 섞지 않는다 (킬 테이블이 SoT).
 */
"use strict";

const KILL_SWITCH_IDS = Object.freeze([
  "GLOBAL_OPPORTUNITY_PAUSE",
  "GLOBAL_MATCHING_PAUSE",
  "GLOBAL_WITHDRAW_PAUSE",
  "GLOBAL_DEPOSIT_PAUSE",
  "GLOBAL_ALL_PAUSE",
  "MONEY_CIRCUIT",
  "PUSH_KILL",
  "GROWTH_PAUSE",
  "REFERRAL_ACCRUAL_HALT",
]);

const KILL_SWITCH_ID_SET = new Set(KILL_SWITCH_IDS);

const ALIASES = Object.freeze({
  money_circuit: "MONEY_CIRCUIT",
  push_kill: "PUSH_KILL",
  growth_enabled: "GROWTH_PAUSE",
  referral_accrual_halt: "REFERRAL_ACCRUAL_HALT",
});

const PATH_SWITCHES = Object.freeze({
  opportunity: Object.freeze(["GLOBAL_OPPORTUNITY_PAUSE"]),
  matching: Object.freeze([
    "GLOBAL_MATCHING_PAUSE",
    "GLOBAL_OPPORTUNITY_PAUSE",
    "MONEY_CIRCUIT",
  ]),
  withdraw: Object.freeze(["GLOBAL_WITHDRAW_PAUSE", "MONEY_CIRCUIT"]),
  deposit: Object.freeze(["GLOBAL_DEPOSIT_PAUSE"]),
  merge: Object.freeze(["MONEY_CIRCUIT"]),
  push: Object.freeze(["PUSH_KILL"]),
  growth: Object.freeze(["GROWTH_PAUSE"]),
  referral_accrual: Object.freeze(["REFERRAL_ACCRUAL_HALT"]),
});

const BLOCK_CODE = "CIRCUIT_OPEN";
const REASON_MIN = 10;

/** @type {Record<string, boolean>} */
let memoryEngaged = Object.create(null);

function resetMemory() {
  memoryEngaged = Object.create(null);
}

function setMemory(id, engaged) {
  const normalized = normalizeId(id);
  if (!normalized.ok) return normalized;
  memoryEngaged[normalized.id] = engaged === true;
  return { ok: true, id: normalized.id, engaged: engaged === true };
}

function getMemory() {
  return { ...memoryEngaged };
}

function defaultEngagedById() {
  /** @type {Record<string, boolean>} */
  const state = {};
  for (const id of KILL_SWITCH_IDS) state[id] = false;
  return state;
}

function normalizeId(raw) {
  const token = String(raw || "").trim();
  const mapped = ALIASES[token] || token;
  if (!KILL_SWITCH_ID_SET.has(mapped)) {
    return { ok: false, error: "KILL_SWITCH_ID_UNKNOWN" };
  }
  return { ok: true, id: mapped };
}

function mergeEngaged(base, overlay) {
  const next = defaultEngagedById();
  const sources = [base, overlay];
  for (const src of sources) {
    if (!src || typeof src !== "object") continue;
    for (const [key, value] of Object.entries(src)) {
      const normalized = normalizeId(key);
      if (normalized.ok) next[normalized.id] = value === true;
    }
  }
  return next;
}

function knownPaths() {
  return Object.keys(PATH_SWITCHES);
}

/**
 * @param {string} path
 * @param {Record<string, boolean>} engagedById
 * @returns {{ blocked: boolean, switchId: string | null, code: string | null }}
 */
function evaluatePath(path, engagedById) {
  const state = mergeEngaged(null, engagedById);
  if (state.GLOBAL_ALL_PAUSE === true) {
    return {
      blocked: true,
      switchId: "GLOBAL_ALL_PAUSE",
      code: BLOCK_CODE,
    };
  }
  const switches = PATH_SWITCHES[path];
  if (!switches) {
    return { blocked: false, switchId: null, code: null };
  }
  for (const id of switches) {
    if (state[id] === true) {
      return { blocked: true, switchId: id, code: BLOCK_CODE };
    }
  }
  return { blocked: false, switchId: null, code: null };
}

function isBlocked(path, engagedById) {
  return evaluatePath(path, engagedById).blocked === true;
}

function requireReason(reason) {
  const text = String(reason || "").trim();
  if (text.length < REASON_MIN) {
    return { ok: false, error: "KILL_SWITCH_REASON_MIN" };
  }
  return { ok: true, reason: text };
}

function applyToggle(engagedById, rawId, engaged) {
  const normalized = normalizeId(rawId);
  if (!normalized.ok) return normalized;
  const next = mergeEngaged(null, engagedById);
  next[normalized.id] = engaged === true;
  return { ok: true, id: normalized.id, engaged: engaged === true, state: next };
}

module.exports = {
  KILL_SWITCH_IDS,
  ALIASES,
  PATH_SWITCHES,
  BLOCK_CODE,
  REASON_MIN,
  resetMemory,
  setMemory,
  getMemory,
  defaultEngagedById,
  normalizeId,
  mergeEngaged,
  knownPaths,
  evaluatePath,
  isBlocked,
  requireReason,
  applyToggle,
};
