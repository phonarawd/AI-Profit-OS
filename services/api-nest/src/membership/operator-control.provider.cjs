/**
 * 운영 제어 provider 분리.
 * test_memory 는 격리 테스트 전용.
 * runtime_persist 만 실참여(effective/participate) 권위.
 * 메모리 draft / in-memory store 는 runtime 추가 허용 근거가 될 수 없다.
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
const grade = require("./grade-daily-policy.core.cjs");
const bonus = require("./bonus-match-grant.core.cjs");
const persist = require("./operator-control.persist.cjs");

const PROVIDER_KIND = Object.freeze({
  TEST_MEMORY: "test_memory",
  RUNTIME_PERSIST: "runtime_persist",
});

function storeUnreadyError(detail) {
  const err = new Error("operator control store is not ready");
  err.code = "STORE_UNREADY";
  err.applied = false;
  err.storeStatus = "unready";
  err.detail = detail || "schema_or_provider_unready";
  return err;
}

function createTestMemoryProvider(seed) {
  return {
    kind: PROVIDER_KIND.TEST_MEMORY,
    testOnly: true,
    gradeStore: grade.createGradeDailyPolicyStore(seed && seed.grade),
    bonusStore: bonus.createBonusGrantStore(),
  };
}

function createRuntimePersistProvider(db) {
  return {
    kind: PROVIDER_KIND.RUNTIME_PERSIST,
    testOnly: false,
    db,
  };
}

/**
 * 실참여에 쓸 추가 잔여.
 * runtime 에서는 memoryRemaining 을 절대 쓰지 않는다.
 */
function resolveParticipateBonusRemaining(input) {
  const kind = input && input.providerKind;
  const memoryRaw = membership.readExplicitNonNegativeInt(
    input && input.memoryRemaining,
  );
  if (kind === PROVIDER_KIND.TEST_MEMORY) {
    const n = membership.readExplicitNonNegativeInt(input && input.testRemaining);
    const remaining = n === null ? (memoryRaw === null ? 0 : memoryRaw) : n;
    return {
      remaining,
      source: "test_memory",
      allowedForParticipate: true,
      storeUnready: false,
      ignoredMemoryDraft: false,
      providerKind: kind,
    };
  }
  if (kind !== PROVIDER_KIND.RUNTIME_PERSIST) {
    return {
      remaining: 0,
      source: "unknown_provider_blocked",
      allowedForParticipate: false,
      storeUnready: true,
      ignoredMemoryDraft: memoryRaw !== null,
      providerKind: kind || "missing",
    };
  }
  if (input.schemaReady !== true) {
    return {
      remaining: 0,
      source: "store_unready",
      allowedForParticipate: false,
      storeUnready: true,
      ignoredMemoryDraft: memoryRaw !== null,
      providerKind: kind,
    };
  }
  const persistRaw = membership.readExplicitNonNegativeInt(
    input && input.persistRemaining,
  );
  return {
    remaining: persistRaw === null ? 0 : persistRaw,
    source: "runtime_persist",
    allowedForParticipate: true,
    storeUnready: false,
    ignoredMemoryDraft: memoryRaw !== null,
    providerKind: kind,
  };
}

/**
 * 실참여/effective 의 등급별 하루 한도.
 * runtime + 스키마 미준비면 컴파일 기본값. 메모리 draft cap 은 무시.
 */
function resolveRuntimeGradePolicyCap(input) {
  const kind = input && input.providerKind;
  const compiled = membership.GRADE_DAILY_MATCH_DEFAULTS[input && input.grade];
  const compiledCap =
    membership.readExplicitNonNegativeInt(compiled) === null
      ? membership.NEW_SIGNUP_DAILY_MATCH_CAP
      : compiled;
  const memoryCap = membership.readExplicitNonNegativeInt(
    input && input.memoryCap,
  );
  if (kind === PROVIDER_KIND.TEST_MEMORY) {
    const n = membership.readExplicitNonNegativeInt(input && input.testCap);
    return {
      cap: n === null ? (memoryCap === null ? compiledCap : memoryCap) : n,
      source: "test_memory",
      storeUnready: false,
      ignoredMemoryDraft: false,
      providerKind: kind,
    };
  }
  if (kind === PROVIDER_KIND.RUNTIME_PERSIST && input.schemaReady === true) {
    const persistCap = membership.readExplicitNonNegativeInt(
      input && input.persistCap,
    );
    return {
      cap: persistCap === null ? compiledCap : persistCap,
      source: persistCap === null ? "compiled_default" : "runtime_persist",
      storeUnready: false,
      ignoredMemoryDraft: memoryCap !== null,
      providerKind: kind,
    };
  }
  return {
    cap: compiledCap,
    source: "compiled_default",
    storeUnready: kind === PROVIDER_KIND.RUNTIME_PERSIST,
    ignoredMemoryDraft: memoryCap !== null,
    providerKind: kind || "missing",
  };
}

function projectSeparatedParticipateQuota(input) {
  const bonusRem = resolveParticipateBonusRemaining(input);
  const gradeCap = resolveRuntimeGradePolicyCap(input);
  const quota = bonus.projectEffectiveParticipateQuota({
    userId: input.userId,
    used: input.used,
    overrideDailyUserMatchCap: input.overrideDailyUserMatchCap,
    membershipRowCap: input.membershipRowCap,
    gradePolicyCap: gradeCap.cap,
    ladderCap: input.ladderCap,
    policyCap: input.policyCap,
    bonusRemaining: bonusRem.remaining,
    explicitParticipateBlock: input.explicitParticipateBlock,
    safetyDeny: input.safetyDeny,
    accountFrozen: input.accountFrozen,
    at: input.at,
  });
  return {
    ...quota,
    gradeCapSource: gradeCap.source,
    bonusSource: bonusRem.source,
    storeUnready: bonusRem.storeUnready === true || gradeCap.storeUnready === true,
    schemaReady: input.schemaReady === true,
    providerKind: input.providerKind,
    ignoredMemoryDraft:
      bonusRem.ignoredMemoryDraft === true || gradeCap.ignoredMemoryDraft === true,
  };
}

/**
 * runtime 경로의 실제 DB 조회. 미준비면 추가 잔여 0 + 컴파일 기본 등급 한도.
 */
async function projectRuntimeParticipateQuota(input) {
  const db = input && input.db;
  const pre = await persist.preflightOperatorControlSchema(db);
  let persistCap = null;
  let persistRemaining = 0;
  if (pre.gradeReady === true) {
    const listed = await persist.listGradeDailyPolicy(db, { skipPreflight: true });
    persistCap = listed.caps && listed.caps[input.membership];
  }
  if (pre.bonusReady === true) {
    const rem = await persist.projectBonusRemaining(db, input.userId, {
      skipPreflight: true,
    });
    persistRemaining = rem.remaining;
  }
  return projectSeparatedParticipateQuota({
    ...input,
    providerKind: PROVIDER_KIND.RUNTIME_PERSIST,
    schemaReady: pre.ready === true,
    persistCap,
    persistRemaining,
    memoryRemaining: input.memoryRemaining,
    memoryCap: input.memoryCap,
    grade: input.membership,
  });
}

/**
 * 저장소 미준비에서 새 기능 쓰기 차단. 허위 성공 금지.
 */
function assertRuntimeWriteReady(preflight, feature) {
  if (!preflight || preflight.ready !== true) {
    throw storeUnreadyError(feature || "write");
  }
  if (feature === "grade" && preflight.gradeReady !== true) {
    throw storeUnreadyError("grade_schema");
  }
  if (feature === "bonus" && preflight.bonusReady !== true) {
    throw storeUnreadyError("bonus_schema");
  }
  if (feature === "presentation" && preflight.presentationReady !== true) {
    throw storeUnreadyError("presentation_schema");
  }
}

function assertNotRuntimeMemoryAuthority(kind) {
  if (kind === PROVIDER_KIND.TEST_MEMORY) {
    const err = new Error("test_memory provider cannot authorize runtime participate");
    err.code = "TEST_PROVIDER_FORBIDDEN_IN_RUNTIME";
    throw err;
  }
}

module.exports = {
  PROVIDER_KIND,
  createTestMemoryProvider,
  createRuntimePersistProvider,
  resolveParticipateBonusRemaining,
  resolveRuntimeGradePolicyCap,
  projectSeparatedParticipateQuota,
  projectRuntimeParticipateQuota,
  assertRuntimeWriteReady,
  assertNotRuntimeMemoryAuthority,
  storeUnreadyError,
  NEW_SIGNUP_DAILY_MATCH_CAP: membership.NEW_SIGNUP_DAILY_MATCH_CAP,
  GRADE_DAILY_MATCH_DEFAULTS: membership.GRADE_DAILY_MATCH_DEFAULTS,
};
