/**
 * REL-021 committed spec.
 * pref=false → 발송 0. 세 채널이 서로 섞이지 않음.
 */
const {
  assertQaIsolation,
} = require("../e2e/lib/qa-env-isolation-guard.cjs");
const { runChannelFilterCases } = require("./pwa-push-channel-filter-harness.cjs");

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function run() {
  assertQaIsolation({ purpose: "e2e", host: "localhost" });
  const cases = runChannelFilterCases();
  assert(
    JSON.stringify(cases.autoChannels) ===
      JSON.stringify(["notice", "campaign", "opportunity"]),
    "auto channel contract",
  );
  assert(cases.isolation.noticeOffBlocksNotice, "notice OFF blocks notice");
  assert(cases.isolation.noticeOffAllowsCampaign, "notice OFF must not mix campaign");
  assert(cases.isolation.campaignOffBlocksCampaign, "campaign OFF blocks campaign");
  assert(cases.isolation.campaignOffAllowsNotice, "campaign OFF must not mix notice");
  assert(
    cases.isolation.opportunityOffBlocksOpportunity,
    "opportunity OFF blocks opportunity",
  );
  assert(
    cases.isolation.opportunityOffAllowsNotice,
    "opportunity OFF must not mix notice",
  );
  assert(cases.isolation.masterOffBlocksAll, "master OFF blocks all auto channels");
  assert(cases.planNoticeOff.enqueue === false, "plan notice OFF");
  assert(cases.planNoticeOff.status === "filtered", "plan notice status");
  assert(cases.planCampaignOn.enqueue === true, "plan campaign still enqueues");
  assert(cases.planExplicit.enqueue === false, "explicit channelAllowed=false");
  assert(cases.planMissingChannel.enqueue === false, "missing channel + prefs");
  assert(cases.filteredDispatch.sendAttempted === false, "dispatch sendAttempted");
  assert(cases.sendCalls === 0, "EXIT_GATE sendCalls");
  console.log("[pwa-push-channel-filter.spec] PASS");
}

if (require.main === module) {
  try {
    run();
  } catch (err) {
    console.error("[pwa-push-channel-filter.spec] FAIL", err.message);
    process.exit(1);
  }
}

module.exports = { run };
