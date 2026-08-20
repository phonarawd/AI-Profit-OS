/**
 * REL-021 committed filter cases. QA_ENV_ISOLATION_GUARD 재사용.
 */
const {
  assertQaIsolation,
} = require("../e2e/lib/qa-env-isolation-guard.cjs");
const {
  AUTO_PUSH_CHANNELS,
  filterAutoPush,
  shouldAllowPref,
} = require("../../workers/push-dispatcher/src/lib/channel-filter.cjs");
const { planEmit, dispatchPush } = require("../../workers/push-dispatcher/src/lib/dispatch.cjs");

const ALL_ON = Object.freeze({
  master: true,
  notice: true,
  campaign: true,
  opportunity: true,
  wallet: true,
  opsMessage: true,
  strategyMatch: true,
});

function runChannelFilterCases() {
  assertQaIsolation({ purpose: "qa", host: "localhost" });

  const noticeOff = { ...ALL_ON, notice: false };
  const campaignOff = { ...ALL_ON, campaign: false };
  const opportunityOff = { ...ALL_ON, opportunity: false };
  const masterOff = { ...ALL_ON, master: false };

  const isolation = {
    noticeOffBlocksNotice: filterAutoPush(noticeOff, "notice").enqueue === false,
    noticeOffAllowsCampaign: filterAutoPush(noticeOff, "campaign").enqueue === true,
    campaignOffBlocksCampaign: filterAutoPush(campaignOff, "campaign").enqueue === false,
    campaignOffAllowsNotice: filterAutoPush(campaignOff, "notice").enqueue === true,
    opportunityOffBlocksOpportunity:
      filterAutoPush(opportunityOff, "opportunity").enqueue === false,
    opportunityOffAllowsNotice: filterAutoPush(opportunityOff, "notice").enqueue === true,
    masterOffBlocksAll: AUTO_PUSH_CHANNELS.every(
      (ch) => filterAutoPush(masterOff, ch).enqueue === false,
    ),
    unknownChannelBlocked: filterAutoPush(ALL_ON, "wallet").enqueue === false,
  };

  const planNoticeOff = planEmit({
    pushEnabled: true,
    subscriptionCount: 1,
    prefs: noticeOff,
    channel: "notice",
  });
  const planCampaignOn = planEmit({
    pushEnabled: true,
    subscriptionCount: 1,
    prefs: noticeOff,
    channel: "campaign",
  });
  const planExplicit = planEmit({
    pushEnabled: true,
    subscriptionCount: 1,
    channelAllowed: false,
    channel: "notice",
  });
  const planMissingChannel = planEmit({
    pushEnabled: true,
    subscriptionCount: 1,
    prefs: ALL_ON,
  });

  let sendCalls = 0;
  const filteredDispatch = dispatchPush(
    {
      pushEnabled: true,
      prefs: noticeOff,
      channel: "notice",
      subscription: {
        endpoint: "https://push.example.test/sub/1",
        p256dh: "p256dh-key-value",
        auth: "auth-key-value",
      },
      vapid: { publicKey: "pub", privateKey: "priv" },
    },
    {
      sendWebPush() {
        sendCalls += 1;
        return { ok: true };
      },
    },
  );

  return {
    autoChannels: AUTO_PUSH_CHANNELS.slice(),
    isolation,
    planNoticeOff,
    planCampaignOn,
    planExplicit,
    planMissingChannel,
    filteredDispatch,
    sendCalls,
    helperNoticeOff: shouldAllowPref(noticeOff, "notice"),
    helperCampaignOn: shouldAllowPref(noticeOff, "campaign"),
  };
}

module.exports = { ALL_ON, runChannelFilterCases };
