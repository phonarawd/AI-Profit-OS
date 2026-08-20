/**
 * UI §50.1n — signup defaults ALL true
 * OFF → Web Push skip only · inbox row still stored
 */

export const NOTIFICATION_PREFS_DEFAULTS = Object.freeze({
  master: true,
  opportunity: true,
  wallet: true,
  notice: true,
  campaign: true,
  opsMessage: true,
  strategyMatch: true,
});

export type NotificationPrefsV1 = {
  userId: string;
  master: boolean;
  opportunity: boolean;
  wallet: boolean;
  notice: boolean;
  campaign: boolean;
  opsMessage: boolean;
  strategyMatch: boolean;
  updatedAt?: string;
};

export type NotifyPushChannel =
  | "opportunity"
  | "wallet"
  | "notice"
  | "campaign"
  | "opsMessage"
  | "strategyMatch";

/** REL-021 / E-PWA-003 — 자동 팬아웃 채널. 서로 섞이지 않음. */
export const AUTO_PUSH_CHANNELS = Object.freeze([
  "notice",
  "campaign",
  "opportunity",
] as const);

export type AutoPushChannel = (typeof AUTO_PUSH_CHANNELS)[number];

/** Prefs OFF or master OFF → Push 0 (inbox still OK). */
export function shouldSendPush(
  prefs: Omit<NotificationPrefsV1, "userId" | "updatedAt">,
  channel: NotifyPushChannel,
): boolean {
  if (prefs.master !== true) return false;
  return prefs[channel] === true;
}
