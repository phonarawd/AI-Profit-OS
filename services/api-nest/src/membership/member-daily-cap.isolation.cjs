"use strict";

const path = require("path");
const core = require(path.join(__dirname, "member-daily-cap.core.cjs"));
const ms = require(path.join(
  __dirname,
  "..",
  "..",
  "..",
  "market-intelligence",
  "src",
  "match-strictness.cjs",
));

const fails = [];
function check(cond, msg) {
  if (!cond) fails.push(msg);
}

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";

check(core.readExplicitNonNegativeInt(0) === 0, "0 must be explicit int");
check(core.readExplicitNonNegativeInt(null) === null, "null is unset");
check(core.readExplicitNonNegativeInt("") === null, "empty is unset");
check(core.readExplicitNonNegativeInt(-1) === null, "negative invalid");
check(core.readExplicitNonNegativeInt(1.5) === null, "float invalid");

const zeroResolved = core.resolveMemberDailyMatchCap({
  userId: USER_A,
  overrideDailyUserMatchCap: 0,
  membershipRowCap: 8,
  ladderCap: 8,
  policyCap: 8,
});
check(zeroResolved.cap === 0, "override 0 must win over row/ladder 8");
check(zeroResolved.source === "user_override", "source user_override");

const rowZero = core.resolveMemberDailyMatchCap({
  userId: USER_A,
  membershipRowCap: 0,
  ladderCap: 8,
  policyCap: 8,
});
check(rowZero.cap === 0, "row 0 must win over ladder 8");

const wouldFallback = Number(0) || 8;
check(wouldFallback === 8, "sanity: || still swallows 0");
check(zeroResolved.cap !== wouldFallback, "resolver must not swallow 0");

const blocked0 = core.decideMemberParticipate({
  userId: USER_A,
  used: 0,
  overrideDailyUserMatchCap: 0,
  membershipRowCap: 8,
  ladderCap: 8,
  slotsLeft: 2,
});
check(blocked0.allowed === false, "cap 0 used 0 must deny");
check(
  blocked0.deny && blocked0.deny.code === "DAILY_MATCH_CAP",
  "DAILY_MATCH_CAP",
);
check(blocked0.quota.remaining === 0, "remaining 0");

const under = core.decideMemberParticipate({
  userId: USER_A,
  used: 2,
  overrideDailyUserMatchCap: 3,
  membershipRowCap: 8,
  slotsLeft: 2,
});
check(under.allowed === true, "used 2 cap 3 must allow");
check(under.quota.remaining === 1, "remaining 1");

const exhausted = core.decideMemberParticipate({
  userId: USER_A,
  used: 5,
  overrideDailyUserMatchCap: 3,
  membershipRowCap: 8,
  slotsLeft: 2,
});
check(exhausted.allowed === false, "used>cap must deny");
check(exhausted.quota.remaining === 0, "remaining never negative");

const a0 = core.decideMemberParticipate({
  userId: USER_A,
  used: 0,
  overrideDailyUserMatchCap: 0,
  membershipRowCap: 8,
  slotsLeft: 2,
});
const bOk = core.decideMemberParticipate({
  userId: USER_B,
  used: 1,
  overrideDailyUserMatchCap: 4,
  membershipRowCap: 8,
  slotsLeft: 2,
});
check(a0.allowed === false && bOk.allowed === true, "A blocked must not block B");
check(a0.quota.cap === 0 && bOk.quota.cap === 4, "caps independent");

const base = {
  ...ms.applyMatchStrictness({ matchStrictness: "standard" }),
  retryWaitSec: 4,
};
const beforeQuality = core.mergeEffectivePolicy({
  basePolicy: base,
  membership: "core",
  capitalBand: "mid",
  membershipBandOverlayEnabled: false,
});
const afterCap = core.mergeEffectivePolicy({
  basePolicy: base,
  membership: "core",
  capitalBand: "mid",
  membershipBandOverlayEnabled: false,
  userOverride: {
    matchStrictnessOverride: "standard",
    dailyUserMatchCap: 0,
  },
});
check(afterCap.dailyUserMatchCap === 0, "preset + cap 0 must keep 0");
check(
  afterCap.minProfitUsdt === beforeQuality.minProfitUsdt,
  "cap-only must not change minProfitUsdt",
);
check(
  afterCap.staleAllowanceSec === beforeQuality.staleAllowanceSec,
  "cap-only must not change staleAllowanceSec",
);

const nextOv = core.nextCapOnlyOverride(
  {
    userId: USER_A,
    matchStrictnessOverride: "tight",
    minProfitUsdt: "8",
    staleAllowanceSec: 2,
    maxRematchCount: 1,
    dailyUserMatchCap: 3,
  },
  0,
  { reason: "member A block new participate", updatedByAdminId: USER_B },
);
check(nextOv.dailyUserMatchCap === 0, "next override cap 0");
check(nextOv.minProfitUsdt === "8", "next override keeps minProfit");
check(nextOv.insertMode === "update_cap_only", "update existing");

try {
  core.assertMemberDailyMatchCap(-3);
  fails.push("negative cap must throw");
} catch (e) {
  check(e.code === "INVALID_CAP", "INVALID_CAP on negative");
}

const mem = require(path.join(
  __dirname,
  "..",
  "..",
  "..",
  "market-intelligence",
  "src",
  "membership.cjs",
));
const afterForceKeep = mem.rowCapAfterGradeChange({
  hasIndividualCapOverride: true,
  currentRowCap: 0,
  nextGradeCap: 6,
});
check(afterForceKeep.rowCap === 0, "force/reapply must keep explicit 0 row when override");
const stillZero = core.resolveMemberDailyMatchCap({
  userId: USER_A,
  overrideDailyUserMatchCap: 0,
  membershipRowCap: afterForceKeep.rowCap,
  gradePolicyCap: 6,
  ladderCap: 6,
});
check(stillZero.cap === 0, "override 0 survives AUTO/MANUAL grade change");
const afterReapply = core.resolveMemberDailyMatchCap({
  userId: USER_A,
  overrideDailyUserMatchCap: 4,
  membershipRowCap: 6,
  gradePolicyCap: 6,
});
check(afterReapply.cap === 4, "reapply grade default 6 must not hide override 4");

if (fails.length) {
  console.error("[member-daily-cap.isolation] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[member-daily-cap.isolation] PASS");
