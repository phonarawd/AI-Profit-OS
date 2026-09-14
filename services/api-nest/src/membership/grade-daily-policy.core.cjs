/**
 * 등급별 하루 기본 기회 (Q11). membership.cjs 상수만으로 한도를 바꾸는 구조를 대체.
 * 기존 회원 행 backfill 없음. 다른 등급 숫자는 호출자가 보낸 값만 저장.
 */

"use strict";

const path = require("path");
const membership = require(path.join(
  __dirname,
  "..",
  "..",
  "..",
  "market-intelligence",
  "src",
  "membership.cjs",
));

const {
  MEMBERSHIP_ENUM,
  GRADE_DAILY_MATCH_DEFAULTS,
  NEW_SIGNUP_DAILY_MATCH_CAP,
  readExplicitNonNegativeInt,
} = membership;

function cloneDefaults() {
  /** @type {Record<string, number>} */
  const out = {};
  for (const id of MEMBERSHIP_ENUM) {
    out[id] = GRADE_DAILY_MATCH_DEFAULTS[id];
  }
  return out;
}

function emptyHistory() {
  return [];
}

function createGradeDailyPolicyStore(seed) {
  return {
    revision: seed && Number.isInteger(seed.revision) ? seed.revision : 0,
    caps: seed && seed.caps ? { ...cloneDefaults(), ...seed.caps } : cloneDefaults(),
    history: Array.isArray(seed && seed.history) ? seed.history.slice() : emptyHistory(),
  };
}

function assertGradeId(grade) {
  if (!MEMBERSHIP_ENUM.includes(grade)) {
    const err = new Error("unknown membership grade");
    err.code = "INVALID_GRADE";
    throw err;
  }
  return grade;
}

function assertCap(raw) {
  const n = readExplicitNonNegativeInt(raw);
  if (n === null) {
    const err = new Error("grade daily cap must be a non-negative integer");
    err.code = "INVALID_CAP";
    throw err;
  }
  return n;
}

function assertReason(reason) {
  if (typeof reason !== "string" || reason.trim().length < 10) {
    const err = new Error("reason minLength 10");
    err.code = "REASON_REQUIRED";
    throw err;
  }
  return reason.trim();
}

/**
 * 한 등급만 변경. 다른 등급 불변. 기존 회원 행 목록은 미리보기만.
 */
function previewGradeDailyCapChange(store, input) {
  const grade = assertGradeId(input.grade);
  const nextCap = assertCap(input.dailyUserMatchCap);
  const before = store.caps[grade];
  /** @type {Record<string, number>} */
  const afterCaps = { ...store.caps, [grade]: nextCap };
  const unchanged = MEMBERSHIP_ENUM.filter((id) => id !== grade).every(
    (id) => afterCaps[id] === store.caps[id],
  );
  return {
    grade,
    before,
    after: nextCap,
    afterCaps,
    otherGradesUnchanged: unchanged,
    existingMemberRowsRewritten: false,
    newSignupCap:
      grade === "sprout" ? nextCap : NEW_SIGNUP_DAILY_MATCH_CAP,
    applyScope: "new_signup_and_grade_default_only",
    nextRevision: store.revision + 1,
  };
}

function applyGradeDailyCapChange(store, input) {
  const preview = previewGradeDailyCapChange(store, input);
  if (input.expectedRevision != null && input.expectedRevision !== store.revision) {
    const err = new Error("grade daily policy revision conflict");
    err.code = "REVISION_CONFLICT";
    throw err;
  }
  const reason = assertReason(input.reason);
  const actor = String(input.updatedByAdminId || "");
  if (!actor) {
    const err = new Error("updatedByAdminId required");
    err.code = "ACTOR_REQUIRED";
    throw err;
  }
  store.caps[preview.grade] = preview.after;
  store.revision = preview.nextRevision;
  store.history.push({
    revision: store.revision,
    grade: preview.grade,
    before: preview.before,
    after: preview.after,
    reason,
    updatedByAdminId: actor,
    at: String(input.at || new Date().toISOString()),
    existingMemberRowsRewritten: false,
  });
  return {
    ...preview,
    revision: store.revision,
    persistence: "memory_draft_not_durable",
    ledgerMutated: false,
  };
}

function restoreGradeDailyDefaults(store, input) {
  const reason = assertReason(input.reason);
  const before = { ...store.caps };
  store.caps = cloneDefaults();
  store.revision += 1;
  store.history.push({
    revision: store.revision,
    grade: "all",
    before,
    after: { ...store.caps },
    reason,
    updatedByAdminId: String(input.updatedByAdminId || ""),
    at: new Date().toISOString(),
    restoreDefaults: true,
    existingMemberRowsRewritten: false,
  });
  return {
    caps: { ...store.caps },
    revision: store.revision,
    persistence: "memory_draft_not_durable",
    ledgerMutated: false,
  };
}

function listGradeDailyPolicy(store) {
  return {
    caps: { ...store.caps },
    compiledDefaults: cloneDefaults(),
    newSignupDailyMatchCap: NEW_SIGNUP_DAILY_MATCH_CAP,
    revision: store.revision,
    history: store.history.slice(),
    timezone: membership.QUOTA_DAY_TIMEZONE,
    existingMemberBackfill: false,
    persistence: "compiled_default_or_memory_draft",
  };
}

function gradePolicyCapOf(store, grade) {
  assertGradeId(grade);
  const n = readExplicitNonNegativeInt(store.caps[grade]);
  return n === null ? GRADE_DAILY_MATCH_DEFAULTS[grade] : n;
}

module.exports = {
  createGradeDailyPolicyStore,
  previewGradeDailyCapChange,
  applyGradeDailyCapChange,
  restoreGradeDailyDefaults,
  listGradeDailyPolicy,
  gradePolicyCapOf,
  cloneDefaults,
  NEW_SIGNUP_DAILY_MATCH_CAP,
  GRADE_DAILY_MATCH_DEFAULTS,
};
