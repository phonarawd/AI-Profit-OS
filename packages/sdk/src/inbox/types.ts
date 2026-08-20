/**
 * @aipo/sdk/inbox — C-ACC-002
 * GET /api/v1/me/inbox · read/hide · GET/PUT notification-prefs
 * 빈 목록은 진실. 합성 알림 발명 0.
 */

export type InboxRequestOpts = {
  apiBase?: string;
  getAccessToken?: () => string | null | Promise<string | null>;
  signal?: AbortSignal;
};

export type InboxItem = {
  id: string;
  titleKo: string;
  bodyKo: string;
  href: string | null;
  createdAt: string;
  readAt: string | null;
};

export type InboxList = {
  items: InboxItem[];
};

export type NotificationPrefs = {
  userId: string;
  master: boolean;
  opportunity: boolean;
  wallet: boolean;
  notice: boolean;
  campaign: boolean;
  opsMessage: boolean;
  strategyMatch: boolean;
};

export type NotificationPrefsPatch = Partial<
  Omit<NotificationPrefs, "userId">
>;
