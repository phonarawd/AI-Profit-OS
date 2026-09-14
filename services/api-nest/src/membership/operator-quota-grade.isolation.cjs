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
const fs = require("fs");
const grade = require(path.join(__dirname, "grade-daily-policy.core.cjs"));
const bonus = require(path.join(__dirname, "bonus-match-grant.core.cjs"));
const provider = require(path.join(__dirname, "operator-control.provider.cjs"));
const persist = require(path.join(__dirname, "operator-control.persist.cjs"));
const down = require(path.join(__dirname, "auto-downgrade.core.cjs"));
const present = require(path.join(__dirname, "presentation-profile.core.cjs"));
const m360 = require(path.join(__dirname, "member-360.core.cjs"));
const jwtRev = require(path.join(__dirname, "jwt-revocation.core.cjs"));
const ledger = require(path.join(__dirname, "ledger-adjustment.contract.cjs"));
const support = require(path.join(__dirname, "support-conversation.contract.cjs"));
const bulk = require(path.join(__dirname, "bulk-operator-job.core.cjs"));

const fails = [];
function check(cond, msg) {
  if (!cond) fails.push(msg);
}

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const ADMIN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

check(membership.NEW_SIGNUP_DAILY_MATCH_CAP === 5, "new signup default 5");
check(membership.membershipDefaults("sprout").dailyUserMatchCap === 5, "defaults sprout 5");
check(membership.MEMBERSHIP_LADDER.sprout.dailyUserMatchCap === 8, "observed ladder sprout 8");
check(membership.membershipDefaults("entry").dailyUserMatchCap === 6, "entry 6");
check(membership.membershipDefaults("vip").dailyUserMatchCap === 2, "vip 2");
check(membership.QUOTA_DAY_TIMEZONE === "Asia/Seoul", "KST timezone");

const existingRow = membership.resolveMemberDailyMatchCap({
  userId: USER_A,
  membershipRowCap: 8,
  gradePolicyCap: 5,
  ladderCap: 8,
});
check(existingRow.cap === 8 && existingRow.source === "membership_row", "existing row 8 kept");

const newSignup = membership.resolveMemberDailyMatchCap({
  userId: USER_B,
  gradePolicyCap: 5,
  ladderCap: 8,
});
check(newSignup.cap === 5 && newSignup.source === "grade_policy", "new path uses grade 5");

const store = grade.createGradeDailyPolicyStore();
const applied = grade.applyGradeDailyCapChange(store, {
  grade: "entry",
  dailyUserMatchCap: 7,
  reason: "운영 등급별 하루 기회 조정",
  updatedByAdminId: ADMIN,
  expectedRevision: 0,
});
check(applied.revision === 1, "revision 1");
check(store.caps.entry === 7 && store.caps.sprout === 5, "other grades unchanged");
try {
  grade.applyGradeDailyCapChange(store, {
    grade: "entry",
    dailyUserMatchCap: 4,
    reason: "revision must conflict here",
    updatedByAdminId: ADMIN,
    expectedRevision: 0,
  });
  fails.push("stale revision must throw");
} catch (e) {
  check(e.code === "REVISION_CONFLICT", "REVISION_CONFLICT");
}

const afterForce = membership.rowCapAfterGradeChange({
  hasIndividualCapOverride: true,
  currentRowCap: 8,
  nextGradeCap: 6,
});
check(afterForce.rowCap === 8, "force keeps override row");
check(
  membership.resolveMemberDailyMatchCap({
    overrideDailyUserMatchCap: 0,
    membershipRowCap: afterForce.rowCap,
    gradePolicyCap: 6,
  }).cap === 0,
  "MANUAL_PIN keeps override 0",
);

const bstore = bonus.createBonusGrantStore();
bonus.grantBonusMatches(bstore, {
  userId: USER_A,
  amount: 2,
  reason: "grant unused bonus after daily base",
  updatedByAdminId: ADMIN,
  idempotencyKey: "grant-a-2",
});
check(bstore.grants.length === 1, "one grant");
check(
  bonus.grantBonusMatches(bstore, {
    userId: USER_A,
    amount: 2,
    reason: "grant unused bonus after daily base",
    updatedByAdminId: ADMIN,
    idempotencyKey: "grant-a-2",
  }).replay === true,
  "idempotent grant",
);
check(
  bonus.projectEffectiveParticipateQuota({
    userId: USER_A,
    used: 5,
    overrideDailyUserMatchCap: 5,
    bonusRemaining: 2,
  }).participateRemaining === 2,
  "bonus 2 after base 5",
);
check(
  bonus.projectEffectiveParticipateQuota({
    userId: USER_A,
    used: 0,
    overrideDailyUserMatchCap: 0,
    bonusRemaining: 2,
  }).participateRemaining === 0,
  "bonus does not lift block 0",
);
check(
  bonus.reclaimUnusedBonus(bstore, {
    userId: USER_A,
    amount: 1,
    reason: "reclaim unused bonus portion",
  }).remaining === 1,
  "reclaim 1",
);
check(
  bonus.consumeParticipateDraft({
    userId: USER_A,
    used: 5,
    overrideDailyUserMatchCap: 5,
    bonusRemaining: 1,
    idempotencyKey: "p1",
  }).realDbLock === "BLOCKED",
  "DB lock BLOCKED",
);
check(
  down.evaluateAutoDowngrade({
    adminForce: true,
    appliedMembership: "high",
    autoMembership: "sprout",
  }).skippedReason === "MANUAL_PIN",
  "pin skips",
);
check(down.createAutoDowngradePolicy({ enabled: true }).enabled === false, "stay disabled");
check(
  present.validatePresentationProfile(present.V19_DEFAULTS).totalDurationSec === 70,
  "v19 total 70",
);
check(
  present.V19_STEPS.join(",") ===
    "product,compare,cargo,flight,buyer,settle,complete",
  "v19 7 step names and order",
);
check(
  present.V19_DEFAULTS.phaseAtSec.product === 0 &&
    present.V19_DEFAULTS.phaseAtSec.compare === 8 &&
    present.V19_DEFAULTS.phaseAtSec.cargo === 18 &&
    present.V19_DEFAULTS.phaseAtSec.flight === 28 &&
    present.V19_DEFAULTS.phaseAtSec.buyer === 48 &&
    present.V19_DEFAULTS.phaseAtSec.settle === 58 &&
    present.V19_DEFAULTS.phaseAtSec.complete === 66,
  "v19 atSec timetable",
);
check(
  present.isFiveStepDraft({
    steps: present.FIVE_STEP_DRAFT_STEPS,
    phaseSeconds: { product_check: 2 },
  }) === true,
  "five-step draft detected",
);
const compiledUser = present.projectUserFacingProfile({
  profile: present.validatePresentationProfile(present.V19_DEFAULTS),
  revision: 0,
  persistence: "compiled_v19_schema_unready",
  schemaReady: false,
  schemaApplied: false,
  storeStatus: "unready",
});
check(compiledUser.schemaApplied === false, "compiled unready not schemaApplied");
check(compiledUser.totalDurationSec === 70, "user dto total 70");
check(compiledUser.phases[0].atSec === 0, "user dto atSec not at");
check(compiledUser.phases[6].id === "complete", "user dto 7th complete");
check(compiledUser.kind === "user_display_journey", "display kind");
check(compiledUser.durationSecMin == null, "display dto has no durationSecMin");
check(
  present.assertNoDisplayExecutionBridge().mapsFiveStepsToSeven === false,
  "no 5-to-7 map",
);
check(
  present.assertNoDisplayExecutionBridge().scales14To70 === false,
  "no 14-to-70 scale",
);
check(compiledUser.operatorSecondsApplied === false, "compiled not operator applied");
check(
  compiledUser.operatorTimeSettingsComplete === false,
  "compiled v19 is not operator time complete",
);
check(compiledUser.compiledV19IsNotOperatorComplete === true, "flag compiled vs operator");
check(compiledUser.engineDeadlineUntouched === true, "engine deadline untouched");
check(compiledUser.resultUntouched === true, "result untouched");
try {
  present.validatePresentationProfile({
    steps: present.FIVE_STEP_DRAFT_STEPS,
    durationSecMin: 8,
    durationSecMax: 15,
    phaseSeconds: { product_check: 2 },
  });
  fails.push("five-step draft must not validate as product v19");
} catch (e) {
  check(e.code === "LOCKED_STEPS", "five-step draft rejected");
}
try {
  present.validatePresentationProfile({
    phases: present.V19_STEPS.map((id, i) => ({ id, at: i * 10, atSec: i * 10 })),
    totalDurationSec: 70,
  });
  fails.push("at field must be rejected");
} catch (e) {
  check(e.code === "INVALID_FIELD_AT", "at rejected");
}
try {
  present.validatePresentationProfile({
    phases: present.V19_STEPS.map((id, i) => ({ id, atSec: i === 0 ? 0 : 10 * i })),
    totalDurationSec: 20,
  });
  fails.push("atSec >= total must throw");
} catch (e) {
  check(e.code === "INVALID_DURATION", "atSec vs total envelope");
}
check(
  present.presentationDoesNotCredit({
    presentationElapsed: true,
    serverPending: true,
  }).profitCreated === false,
  "elapsed is not credit",
);
check(
  present.presentationDoesNotCredit({
    presentationElapsed: true,
    serverPending: true,
  }).result === "RESULT_PENDING",
  "elapsed stays pending",
);
const defaultBound = present.bindJourneyPresentation({
  journeyId: "j-default",
  profile: present.V19_DEFAULTS,
  startedAt: "2026-09-14T00:00:00.000Z",
});
check(defaultBound.boundProfile.totalDurationSec === 70, "bind default 70");
check(defaultBound.reloadUsesBoundProfile === true, "reload uses bound");
const operatorChanged = present.validatePresentationProfile({
  phases: [
    { id: "product", atSec: 0 },
    { id: "compare", atSec: 6 },
    { id: "cargo", atSec: 16 },
    { id: "flight", atSec: 26 },
    { id: "buyer", atSec: 46 },
    { id: "settle", atSec: 56 },
    { id: "complete", atSec: 64 },
  ],
  totalDurationSec: 70,
});
const inFlight = present.resolveInFlightProfile({
  boundProfile: defaultBound.boundProfile,
  latestProfile: operatorChanged,
});
check(inFlight.phaseAtSec.compare === 8, "in-flight keeps start snapshot");
check(inFlight.laterProfileIgnored === true, "mid-journey change ignored");
const newJourney = present.resolveNewJourneyProfile({
  latestProfile: operatorChanged,
});
check(newJourney.phaseAtSec.compare === 6, "new journey uses latest");
const resumed = present.resumePausedJourney({
  journeyId: "j-default",
  boundProfile: defaultBound.boundProfile,
  pausedElapsedSec: 12,
});
check(resumed.resumeUsesBoundProfile === true, "pause resume uses bound");
check(resumed.pauseDoesNotMutateMoney === true, "pause no money");
check(resumed.boundProfile.phaseAtSec.flight === 28, "pause keeps default flight 28");
check(
  m360.resolveExactMember360({ requestedUserId: USER_A }).substituted === false,
  "404 no fallback",
);
check(
  jwtRev.decideAccessTokenAdmission({ jwtValid: true, sessionRevoked: true }).admit === false,
  "revoked denied",
);
check(jwtRev.describeCurrentGuardGap().jwtAuthGuardChecksDbRevoke === false, "guard gap");
check(
  support.rejectPreviewAsFullTranscript({ source: "ai_logs.answer_preview" }).ok === false,
  "preview not transcript",
);
try {
  ledger.dryRunBalanceAdjust({
    intent: "FAKE_TRADE_SUCCESS",
    reasonCode: "OPERATOR_COMPENSATION",
    amountUsdt: "10",
    direction: "increase",
    fundingAccount: "ops",
    idempotencyKey: "k1",
  });
  fails.push("fake success must throw");
} catch (e) {
  check(e.code === "FORBIDDEN_INTENT", "FORBIDDEN_INTENT");
}
try {
  ledger.dryRunBalanceAdjust({
    reasonCode: "OPERATOR_COMPENSATION",
    amountUsdt: "10",
    direction: "increase",
    fundingAccount: "ops",
    idempotencyKey: "k1",
    writeEnabled: true,
  });
  fails.push("write must stay disabled");
} catch (e) {
  check(e.code === "WRITE_DISABLED", "WRITE_DISABLED");
}
check(
  ledger.dryRunBalanceAdjust({
    reasonCode: "ERROR_CORRECTION",
    amountUsdt: "3.5",
    direction: "decrease",
    idempotencyKey: "k2",
  }).ledgerMutated === false,
  "adjust dry-run",
);
try {
  bulk.previewBulkTargets({ useCurrentPageAsAll: true, userIds: [USER_A] });
  fails.push("page-as-all must throw");
} catch (e) {
  check(e.code === "PAGE_IS_NOT_ALL", "PAGE_IS_NOT_ALL");
}
const job = bulk.dryRunBulkJob(bulk.createBulkJobStore(), {
  userIds: [USER_A],
  action: "grant_bonus",
  makerId: ADMIN,
  checkerId: ADMIN,
});
check(job.status === "blocked", "maker equals checker blocked");

const memoryIgnored = provider.resolveParticipateBonusRemaining({
  providerKind: provider.PROVIDER_KIND.RUNTIME_PERSIST,
  schemaReady: false,
  persistRemaining: 0,
  memoryRemaining: 99,
});
check(memoryIgnored.remaining === 0, "runtime unready bonus is 0");
check(memoryIgnored.ignoredMemoryDraft === true, "memory draft ignored");
check(memoryIgnored.storeUnready === true, "unready flagged");

const runtimeReadyBonus = provider.resolveParticipateBonusRemaining({
  providerKind: provider.PROVIDER_KIND.RUNTIME_PERSIST,
  schemaReady: true,
  persistRemaining: 2,
  memoryRemaining: 99,
});
check(runtimeReadyBonus.remaining === 2, "persist remaining wins");
check(runtimeReadyBonus.ignoredMemoryDraft === true, "memory still ignored when persist ready");

const testBonus = provider.resolveParticipateBonusRemaining({
  providerKind: provider.PROVIDER_KIND.TEST_MEMORY,
  memoryRemaining: 2,
});
check(testBonus.remaining === 2, "test memory may grant");

const unreadyGrade = provider.resolveRuntimeGradePolicyCap({
  providerKind: provider.PROVIDER_KIND.RUNTIME_PERSIST,
  schemaReady: false,
  grade: "entry",
  memoryCap: 7,
});
check(unreadyGrade.cap === 6, "unready uses compiled entry 6 not memory 7");
check(unreadyGrade.ignoredMemoryDraft === true, "memory grade ignored");

const persistGrade = provider.resolveRuntimeGradePolicyCap({
  providerKind: provider.PROVIDER_KIND.RUNTIME_PERSIST,
  schemaReady: true,
  grade: "entry",
  persistCap: 7,
  memoryCap: 1,
});
check(persistGrade.cap === 7, "persist grade used");

const effUnready = provider.projectSeparatedParticipateQuota({
  providerKind: provider.PROVIDER_KIND.RUNTIME_PERSIST,
  schemaReady: false,
  userId: USER_A,
  used: 5,
  overrideDailyUserMatchCap: 5,
  membership: "sprout",
  memoryRemaining: 2,
});
check(effUnready.participateRemaining === 0, "memory +2 must not allow participate");
check(effUnready.bonusRemaining === 0, "bonus 0 when unready");

const effReady = provider.projectSeparatedParticipateQuota({
  providerKind: provider.PROVIDER_KIND.RUNTIME_PERSIST,
  schemaReady: true,
  userId: USER_A,
  used: 5,
  overrideDailyUserMatchCap: 5,
  membership: "sprout",
  persistRemaining: 2,
  memoryRemaining: 99,
});
check(effReady.participateRemaining === 2, "persist bonus 2 after base 5");
const consumeReady = bonus.consumeParticipateDraft({
  userId: USER_A,
  used: 5,
  overrideDailyUserMatchCap: 5,
  bonusRemaining: effReady.bonusRemaining,
  idempotencyKey: "p-ready",
});
check(consumeReady.allowed === true, "effective allows consume");
check(consumeReady.consumeBonus === 1, "consume matches bonus path");
check(consumeReady.consumeBase === 0, "base already exhausted");

const existing8 = provider.projectSeparatedParticipateQuota({
  providerKind: provider.PROVIDER_KIND.RUNTIME_PERSIST,
  schemaReady: false,
  userId: USER_A,
  used: 3,
  membershipRowCap: 8,
  membership: "sprout",
  memoryRemaining: 4,
});
check(existing8.cap === 8, "explicit row 8 kept");
check(existing8.participateRemaining === 5, "8-3=5, no memory bonus");

const explicit0 = provider.projectSeparatedParticipateQuota({
  providerKind: provider.PROVIDER_KIND.RUNTIME_PERSIST,
  schemaReady: true,
  userId: USER_A,
  used: 0,
  overrideDailyUserMatchCap: 0,
  persistRemaining: 9,
  membership: "sprout",
});
check(explicit0.participateRemaining === 0, "override 0 not lifted by persist bonus");

const new5 = provider.projectSeparatedParticipateQuota({
  providerKind: provider.PROVIDER_KIND.RUNTIME_PERSIST,
  schemaReady: false,
  userId: USER_B,
  used: 0,
  membership: "sprout",
});
check(new5.cap === 5, "compiled sprout 5 when no row");
check(new5.source === "grade_policy" || new5.cap === 5, "new path 5");

const preUnready = persist.evaluateSchemaPreflight({
  grade_table: 0,
  grade_cols: 0,
  bonus_table: 0,
  bonus_cols: 0,
  audit_table: 0,
  audit_cols: 0,
});
check(preUnready.ready === false, "preflight fail-closed");

try {
  provider.assertNotRuntimeMemoryAuthority(provider.PROVIDER_KIND.TEST_MEMORY);
  fails.push("test memory must not authorize runtime");
} catch (e) {
  check(e.code === "TEST_PROVIDER_FORBIDDEN_IN_RUNTIME", "test provider forbidden");
}

const participateSrc = fs.readFileSync(path.join(__dirname, "..", "opportunities", "participate.service.ts"), "utf8");
check(!participateSrc.includes("operator-control.store.cjs"), "participate must not import memory store");
check(participateSrc.includes("operator-control.provider.cjs"), "participate uses runtime provider");
check(participateSrc.includes("operator-control.persist.cjs"), "participate uses persist consume");
const adminSrc = fs.readFileSync(path.join(__dirname, "membership.admin.service.ts"), "utf8");
check(!adminSrc.includes("gradeDailyStore"), "admin service dropped memory grade store");
check(!adminSrc.includes("bonusGrantStore"), "admin service dropped memory bonus store");
check(adminSrc.includes("STORE_UNREADY"), "admin maps store unready");
const moduleSrc = fs.readFileSync(path.join(__dirname, "membership.module.ts"), "utf8");
check(!moduleSrc.includes("createTestMemoryProvider"), "Nest module must not wire test provider");
const storeSrc = fs.readFileSync(path.join(__dirname, "operator-control.store.cjs"), "utf8");
check(!storeSrc.includes("createGradeDailyPolicyStore()"), "store no process memory singleton");
check(!storeSrc.includes("createBonusGrantStore()"), "store no process bonus singleton");

async function addPresentationPersistChecks(fakeUnready) {
  try {
    await persist.applyPresentationProfile(fakeUnready, {
      profile: present.V19_DEFAULTS,
      reason: "save presentation while schema unready",
      updatedByAdminId: ADMIN,
    });
    fails.push("unready presentation write must throw");
  } catch (e) {
    check(e.code === "STORE_UNREADY", "presentation write STORE_UNREADY");
    check(e.applied === false, "unready presentation not applied");
  }
  const listedUnready = await persist.listPresentationProfile(fakeUnready);
  check(
    listedUnready.persistence === "compiled_v19_schema_unready",
    "unready lists compiled v19",
  );
  check(listedUnready.operatorSecondsApplied === false, "unready list not operator seconds");
  check(
    listedUnready.operatorTimeSettingsComplete === false,
    "unready list not operator complete",
  );
  check(listedUnready.schemaApplied === false, "unready schemaApplied false");
  check(listedUnready.profile.totalDurationSec === 70, "unready still compiled 70");
  const fakePresentReady = persist.createFakePersistDb({
    schemaReady: true,
    presentationReady: true,
  });
  const appliedPresent = await persist.applyPresentationProfile(fakePresentReady, {
    profile: {
      phases: [
        { id: "product", atSec: 0 },
        { id: "compare", atSec: 6 },
        { id: "cargo", atSec: 16 },
        { id: "flight", atSec: 26 },
        { id: "buyer", atSec: 46 },
        { id: "settle", atSec: 56 },
        { id: "complete", atSec: 64 },
      ],
      totalDurationSec: 70,
    },
    reason: "save operator phase seconds",
    updatedByAdminId: ADMIN,
  });
  check(appliedPresent.applied === true, "presentation persist applied");
  check(appliedPresent.schemaApplied === true, "apply schemaApplied from preflight");
  check(appliedPresent.operatorSecondsApplied === true, "operator seconds stored");
  check(appliedPresent.engineDeadlineUntouched === true, "deadline not mutated");
  const listedApplied = await persist.listPresentationProfile(fakePresentReady);
  check(listedApplied.profile.phaseAtSec.compare === 6, "operator compare 6 delivered");
  const userDto = present.projectUserFacingProfile(listedApplied);
  check(userDto.phaseAtSec.compare === 6, "user dto carries operator atSec");
  check(userDto.operatorTimeSettingsComplete === true, "only persist is operator complete");
  check(userDto.schemaApplied === true, "user dto schemaApplied from list");
}

async function runPersistChecks() {
  const fakeUnready = persist.createFakePersistDb({ schemaReady: false });
  try {
    await persist.applyGradeDailyCapChange(fakeUnready, {
      grade: "entry",
      dailyUserMatchCap: 7,
      reason: "운영 등급별 하루 기회 조정",
      updatedByAdminId: ADMIN,
    });
    fails.push("unready grade write must throw");
  } catch (e) {
    check(e.code === "STORE_UNREADY", "grade write STORE_UNREADY");
    check(e.applied === false, "unready write not applied");
  }
  try {
    await persist.grantBonusMatches(fakeUnready, {
      userId: USER_A,
      amount: 2,
      reason: "grant unused bonus after daily base",
      updatedByAdminId: ADMIN,
      idempotencyKey: "mem-must-not-persist",
    });
    fails.push("unready bonus write must throw");
  } catch (e) {
    check(e.code === "STORE_UNREADY", "bonus write STORE_UNREADY");
  }

  const fakeReady = persist.createFakePersistDb({ schemaReady: true });
  const appliedPersist = await persist.applyGradeDailyCapChange(fakeReady, {
    grade: "entry",
    dailyUserMatchCap: 7,
    reason: "운영 등급별 하루 기회 조정",
    updatedByAdminId: ADMIN,
    expectedRevision: 0,
  });
  check(appliedPersist.applied === true, "persist grade applied");
  check(appliedPersist.persistence === "runtime_persist", "persist grade durable");
  check(fakeReady.state.audits.length >= 1, "grade audit written");
  check(fakeReady.state.gradeRows[0].caps.entry === 7, "entry 7 stored");
  check(fakeReady.state.gradeRows[0].caps.sprout === 5, "other grade unchanged");

  const granted = await persist.grantBonusMatches(fakeReady, {
    userId: USER_A,
    amount: 2,
    reason: "grant unused bonus after daily base",
    updatedByAdminId: ADMIN,
    idempotencyKey: "grant-persist-2",
  });
  check(granted.replay === false, "first grant");
  const replay = await persist.grantBonusMatches(fakeReady, {
    userId: USER_A,
    amount: 2,
    reason: "grant unused bonus after daily base",
    updatedByAdminId: ADMIN,
    idempotencyKey: "grant-persist-2",
  });
  check(replay.replay === true, "idempotent persist grant");
  check(fakeReady.state.grants.length === 1, "one persist grant row");

  const rem = await persist.projectBonusRemaining(fakeReady, USER_A);
  check(rem.remaining === 2, "persist remaining 2");
  const consumed = await persist.consumeBonusInTx(fakeReady, {
    userId: USER_A,
    amount: 1,
  });
  check(consumed.consumed === 1, "consumed 1");
  const remAfter = await persist.projectBonusRemaining(fakeReady, USER_A);
  check(remAfter.remaining === 1, "remaining 1 after consume");
  check(remAfter.used === 1, "used history kept");

  const runtimeQuota = await provider.projectRuntimeParticipateQuota({
    db: fakeReady,
    userId: USER_A,
    used: 5,
    membership: "sprout",
    overrideDailyUserMatchCap: 5,
  });
  check(runtimeQuota.participateRemaining === 1, "effective matches persist remaining");
  check(runtimeQuota.schemaReady === true, "runtime quota ready");

  const runtimeUnreadyQ = await provider.projectRuntimeParticipateQuota({
    db: fakeUnready,
    userId: USER_A,
    used: 5,
    membership: "sprout",
    overrideDailyUserMatchCap: 5,
    memoryRemaining: 8,
  });
  check(runtimeUnreadyQ.participateRemaining === 0, "runtime db unready ignores memory");
  await addPresentationPersistChecks(fakeUnready);
}

runPersistChecks()
  .then(() => {
    if (fails.length) {
      console.error("[operator-quota-grade.isolation] FAIL\n- " + fails.join("\n- "));
      process.exit(1);
    }
    console.log("[operator-quota-grade.isolation] PASS");
  })
  .catch((e) => {
    console.error("[operator-quota-grade.isolation] FAIL\n- " + (e && e.stack ? e.stack : e));
    process.exit(1);
  });
