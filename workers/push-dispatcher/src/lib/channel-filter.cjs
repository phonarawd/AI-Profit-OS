/**
 * REL-021 — 자동 Push 채널 필터 SSOT.
 * pref=false 또는 채널 없음 → enqueue 0. 세 채널은 서로 섞이지 않는다.
 */
"use strict";

const AUTO_PUSH_CHANNELS = Object.freeze(["notice", "campaign", "opportunity"]);

function isAutoPushChannel(channel) {
  return AUTO_PUSH_CHANNELS.includes(channel);
}

function shouldAllowPref(prefs, channel) {
  if (!prefs || typeof prefs !== "object") return false;
  if (prefs.master !== true) return false;
  if (typeof channel !== "string" || channel.length < 1) return false;
  return prefs[channel] === true;
}

function filterAutoPush(prefs, channel) {
  if (!isAutoPushChannel(channel)) {
    return { allowed: false, status: "unknown_channel", enqueue: false };
  }
  if (!shouldAllowPref(prefs, channel)) {
    return { allowed: false, status: "filtered", enqueue: false };
  }
  return { allowed: true, status: "allowed", enqueue: true };
}

function applyPlanChannelFilter(input) {
  if (input && input.channelAllowed === false) {
    return { status: "filtered", sent: 0, enqueue: false };
  }
  if (input && input.channelAllowed === true) {
    return null;
  }
  if (input && (input.prefs || input.channel)) {
    const channel = input.channel;
    if (isAutoPushChannel(channel)) {
      const decision = filterAutoPush(input.prefs, channel);
      if (!decision.enqueue) {
        return { status: decision.status, sent: 0, enqueue: false };
      }
    } else if (!shouldAllowPref(input.prefs, channel)) {
      return { status: "filtered", sent: 0, enqueue: false };
    }
  }
  return null;
}

module.exports = {
  AUTO_PUSH_CHANNELS,
  isAutoPushChannel,
  shouldAllowPref,
  filterAutoPush,
  applyPlanChannelFilter,
};
