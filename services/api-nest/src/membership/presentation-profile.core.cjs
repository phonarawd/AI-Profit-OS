/**
 * 사용자 Journey 연출 profile (J01–J07).
 *
 * 제품 기본값 = 웹 보고 v19:
 *   product/compare/cargo/flight/buyer/settle/complete
 *   atSec 0,8,18,28,48,58,66 · totalDurationSec 70
 *   시간 필드 = atSec (at 금지)
 *
 * execution-policy DAY1 5단계(product_check… · 8–15초)는 engine presentation 이다.
 * B3 5단계 14초 초안을 제품 Journey 기본값으로 연결하지 않는다.
 *
 * engine tick / Soft60/Hard90 / 원장 / cap / grade / result 와 독립.
 */

"use strict";

const V19_STEPS = Object.freeze([
  "product",
  "compare",
  "cargo",
  "flight",
  "buyer",
  "settle",
  "complete",
]);

const V19_DEFAULT_AT_SEC = Object.freeze({
  product: 0,
  compare: 8,
  cargo: 18,
  flight: 28,
  buyer: 48,
  settle: 58,
  complete: 66,
});

const FIVE_STEP_DRAFT_STEPS = Object.freeze([
  "product_check",
  "price_compare",
  "matching",
  "settle_prep",
  "credit",
]);

const AT_SEC_MIN = 0;
const AT_SEC_MAX = 600;
const TOTAL_SEC_MIN = 1;
const TOTAL_SEC_MAX = 600;

const V19_DEFAULTS = Object.freeze({
  profileId: "journey_v19_default",
  contractVersion: 2,
  steps: V19_STEPS,
  phases: Object.freeze(
    V19_STEPS.map((id) =>
      Object.freeze({ id, atSec: V19_DEFAULT_AT_SEC[id] }),
    ),
  ),
  phaseAtSec: V19_DEFAULT_AT_SEC,
  totalDurationSec: 70,
});

const DISPLAY_KIND = "user_display_journey";
const EXECUTION_POLICY_KIND = "execution_policy_day1";

const PRESENTATION_UNTOUCHED = Object.freeze({
  kind: DISPLAY_KIND,
  audience: "putduk-web",
  moneyUntouched: true,
  capUntouched: true,
  gradeUntouched: true,
  engineDeadlineUntouched: true,
  resultUntouched: true,
  settleTriggeredByPresentation: false,
  noFiveToSevenMapping: true,
  noFourteenToSeventyScale: true,
});

function assertNoDisplayExecutionBridge() {
  return {
    displayKind: DISPLAY_KIND,
    executionPolicyKind: EXECUTION_POLICY_KIND,
    mapsFiveStepsToSeven: false,
    scales14To70: false,
    userDtoHasDurationSecMinMax: false,
    journeyConsumerInThisRepo: false,
    timeSettingsCompleteFromDocsOnly: false,
  };
}

function isFiveStepDraft(input) {
  if (input == null || typeof input !== "object") return false;
  const steps = input.steps;
  if (Array.isArray(steps) && steps[0] === "product_check") return true;
  if (input.phaseSeconds && input.phaseSeconds.product_check != null) return true;
  return false;
}

function assertFiniteNumber(raw, field, { min, max, integer }) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) {
    const err = new Error(`${field} out of range`);
    err.code = "INVALID_DURATION";
    throw err;
  }
  if (integer && !Number.isInteger(n)) {
    const err = new Error(`${field} must be integer`);
    err.code = "INVALID_DURATION";
    throw err;
  }
  return n;
}

function rejectAtField(obj, label) {
  if (obj && typeof obj === "object" && Object.prototype.hasOwnProperty.call(obj, "at")) {
    const err = new Error(`${label || "phase"} uses atSec, not at`);
    err.code = "INVALID_FIELD_AT";
    throw err;
  }
}

function readPhaseAtSecMap(input) {
  rejectAtField(input, "profile");
  if (isFiveStepDraft(input)) {
    const err = new Error("five-step 14s draft is not product journey v19");
    err.code = "LOCKED_STEPS";
    throw err;
  }
  /** @type {Record<string, number>} */
  const map = {};
  if (Array.isArray(input.phases)) {
    if (input.phases.length !== V19_STEPS.length) {
      const err = new Error("presentation.phases locked order");
      err.code = "LOCKED_STEPS";
      throw err;
    }
    for (let i = 0; i < V19_STEPS.length; i += 1) {
      const row = input.phases[i];
      if (row == null || typeof row !== "object") {
        const err = new Error("presentation.phases locked order");
        err.code = "LOCKED_STEPS";
        throw err;
      }
      rejectAtField(row, V19_STEPS[i]);
      if (row.id !== V19_STEPS[i]) {
        const err = new Error("presentation.phases locked order");
        err.code = "LOCKED_STEPS";
        throw err;
      }
      map[V19_STEPS[i]] = row.atSec;
    }
    return map;
  }
  if (input.phaseAtSec && typeof input.phaseAtSec === "object") {
    rejectAtField(input.phaseAtSec, "phaseAtSec");
    for (const step of V19_STEPS) {
      map[step] = input.phaseAtSec[step];
    }
    return map;
  }
  if (Array.isArray(input.steps) && input.steps.length === V19_STEPS.length) {
    for (let i = 0; i < V19_STEPS.length; i += 1) {
      if (input.steps[i] !== V19_STEPS[i]) {
        const err = new Error("presentation.steps locked order");
        err.code = "LOCKED_STEPS";
        throw err;
      }
    }
    return { ...V19_DEFAULT_AT_SEC };
  }
  if (input.steps == null && input.phases == null && input.phaseAtSec == null) {
    return { ...V19_DEFAULT_AT_SEC };
  }
  const err = new Error("presentation.phases locked order");
  err.code = "LOCKED_STEPS";
  throw err;
}

function validatePresentationProfile(input) {
  if (input == null || typeof input !== "object") {
    const err = new Error("presentation profile required");
    err.code = "INVALID_PROFILE";
    throw err;
  }
  const atMap = readPhaseAtSecMap(input);
  const totalDurationSec = assertFiniteNumber(
    input.totalDurationSec != null ? input.totalDurationSec : V19_DEFAULTS.totalDurationSec,
    "totalDurationSec",
    { min: TOTAL_SEC_MIN, max: TOTAL_SEC_MAX, integer: true },
  );
  /** @type {Record<string, number>} */
  const phaseAtSec = {};
  const phases = [];
  let prev = -1;
  for (let i = 0; i < V19_STEPS.length; i += 1) {
    const step = V19_STEPS[i];
    const atSec = assertFiniteNumber(atMap[step], `${step}.atSec`, {
      min: AT_SEC_MIN,
      max: AT_SEC_MAX,
      integer: true,
    });
    if (i === 0 && atSec !== 0) {
      const err = new Error("first phase atSec must be 0");
      err.code = "INVALID_DURATION";
      throw err;
    }
    if (atSec <= prev) {
      const err = new Error("phase atSec must be strictly increasing");
      err.code = "INVALID_DURATION";
      throw err;
    }
    if (atSec >= totalDurationSec) {
      const err = new Error("phase atSec must be < totalDurationSec");
      err.code = "INVALID_DURATION";
      throw err;
    }
    prev = atSec;
    phaseAtSec[step] = atSec;
    phases.push({ id: step, atSec });
  }
  return {
    profileId: String(input.profileId || V19_DEFAULTS.profileId),
    contractVersion: Number(input.contractVersion || V19_DEFAULTS.contractVersion),
    steps: [...V19_STEPS],
    phases,
    phaseAtSec,
    totalDurationSec,
    ...PRESENTATION_UNTOUCHED,
  };
}

function previewPresentationProfile(input) {
  const profile = validatePresentationProfile(input);
  return {
    ...profile,
    previewOnly: true,
    participateCreated: false,
    ledgerMutated: false,
  };
}

function restoreV19Presentation() {
  return previewPresentationProfile(V19_DEFAULTS);
}

function bindJourneyPresentation(input) {
  const profile = validatePresentationProfile(input.profile);
  return {
    journeyId: String(input.journeyId || ""),
    boundProfile: profile,
    boundAt: String(input.startedAt || new Date().toISOString()),
    originAtSec: 0,
    laterProfileIgnored: true,
    reloadUsesBoundProfile: true,
    pauseDoesNotMutateMoney: true,
    ...PRESENTATION_UNTOUCHED,
  };
}

function resolveInFlightProfile(input) {
  const bound = validatePresentationProfile(input.boundProfile);
  return {
    ...bound,
    source: "bound_at_start",
    laterProfileIgnored: true,
    reloadUsesBoundProfile: true,
    ...PRESENTATION_UNTOUCHED,
  };
}

function resolveNewJourneyProfile(input) {
  const latest = validatePresentationProfile(input.latestProfile);
  return {
    ...latest,
    source: "latest_at_start",
    laterProfileIgnored: false,
    ...PRESENTATION_UNTOUCHED,
  };
}

function resumePausedJourney(input) {
  const bound = validatePresentationProfile(input.boundProfile);
  const pausedElapsedSec = assertFiniteNumber(
    input.pausedElapsedSec == null ? 0 : input.pausedElapsedSec,
    "pausedElapsedSec",
    { min: 0, max: AT_SEC_MAX, integer: false },
  );
  return {
    journeyId: String(input.journeyId || ""),
    boundProfile: bound,
    pausedElapsedSec,
    resumeUsesBoundProfile: true,
    laterProfileIgnored: true,
    pauseDoesNotMutateMoney: true,
    ...PRESENTATION_UNTOUCHED,
  };
}

function presentationDoesNotCredit(input) {
  return {
    presentationElapsed: input.presentationElapsed === true,
    serverPending: input.serverPending === true,
    result: input.serverPending === true ? "RESULT_PENDING" : input.serverResult,
    profitCreated: false,
    settleTriggeredByPresentation: false,
    ...PRESENTATION_UNTOUCHED,
  };
}

function projectUserFacingProfile(listed) {
  const persistence = String(
    (listed && listed.persistence) || "compiled_v19_schema_unready",
  );
  const schemaReady = listed && listed.schemaReady === true;
  const schemaApplied = listed && listed.schemaApplied === true;
  const operatorSecondsApplied =
    persistence === "runtime_persist" && schemaReady === true && schemaApplied === true;
  let rawProfile =
    listed && listed.profile != null ? listed.profile : V19_DEFAULTS;
  let fiveStepDraftIgnored = false;
  if (isFiveStepDraft(rawProfile)) {
    rawProfile = V19_DEFAULTS;
    fiveStepDraftIgnored = true;
  }
  const profile = validatePresentationProfile(rawProfile);
  return {
    kind: DISPLAY_KIND,
    audience: "putduk-web",
    profileId: profile.profileId,
    profileContractVersion: profile.contractVersion,
    steps: profile.steps,
    phases: profile.phases.map((p) => ({ id: p.id, atSec: p.atSec })),
    phaseAtSec: { ...profile.phaseAtSec },
    totalDurationSec: profile.totalDurationSec,
    revision: Number((listed && listed.revision) || 0),
    persistence: fiveStepDraftIgnored ? "compiled_v19_five_step_ignored" : persistence,
    schemaReady,
    schemaApplied,
    storeStatus:
      (listed && listed.storeStatus) || (schemaReady ? "ready" : "unready"),
    operatorSecondsApplied: fiveStepDraftIgnored ? false : operatorSecondsApplied,
    operatorTimeSettingsComplete: fiveStepDraftIgnored
      ? false
      : operatorSecondsApplied,
    compiledV19IsNotOperatorComplete: operatorSecondsApplied !== true,
    fiveStepDraftIgnored,
    ...PRESENTATION_UNTOUCHED,
  };
}

function describeOperatorPhaseSecondsWire() {
  return {
    adminRead: "GET /api/v1/admin/membership/presentation-profile",
    adminWrite: "PUT /api/v1/admin/membership/presentation-profile",
    writeBody: {
      profile: {
        profileId: "journey_v19_default",
        contractVersion: 2,
        phases: V19_STEPS.map((id) => ({ id, atSec: V19_DEFAULT_AT_SEC[id] })),
        totalDurationSec: 70,
      },
      reason: "화면 진행 시간 조정",
      expectedRevision: 0,
    },
    userReadField: "GET /api/v1/me/membership → presentationProfile.phases[].atSec",
    journeyConsumer: "putduk-web JourneyStage — not implemented in this repo",
    journeyWired: false,
    saveBlockedWhenSchemaUnready: true,
    compiledDefaultIsNotOperatorSave: true,
    timeSettingsComplete: false,
    timeField: "atSec",
    rejectedTimeField: "at",
  };
}

module.exports = {
  V19_STEPS,
  V19_DEFAULTS,
  V19_DEFAULT_AT_SEC,
  FIVE_STEP_DRAFT_STEPS,
  AT_SEC_MIN,
  AT_SEC_MAX,
  TOTAL_SEC_MIN,
  TOTAL_SEC_MAX,
  DISPLAY_KIND,
  EXECUTION_POLICY_KIND,
  PRESENTATION_UNTOUCHED,
  assertNoDisplayExecutionBridge,
  isFiveStepDraft,
  validatePresentationProfile,
  previewPresentationProfile,
  restoreV19Presentation,
  bindJourneyPresentation,
  resolveInFlightProfile,
  resolveNewJourneyProfile,
  resumePausedJourney,
  presentationDoesNotCredit,
  projectUserFacingProfile,
  describeOperatorPhaseSecondsWire,
};
