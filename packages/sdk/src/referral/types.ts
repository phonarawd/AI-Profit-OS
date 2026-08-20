/**
 * @aipo/sdk/referral — C-ACC-002
 * GET /api/v1/referral/me · bind · share
 * 유저 화면 % · L1/L2/L3 금지. 초대 수 캡 발명 금지.
 */

export type ReferralRequestOpts = {
  apiBase?: string;
  getAccessToken?: () => string | null | Promise<string | null>;
  signal?: AbortSignal;
};

export type ReferralConsumerState =
  | "enabled"
  | "rewards_off"
  | "pool_wait"
  | "bound"
  | "share_limit";

export type ReferralMe = {
  enabled: boolean;
  rewardsEnabled: boolean;
  inviteCountUnlimited: true;
  inviteCount: number;
  bound: boolean;
  poolWait: boolean;
  myReferralCode: string | null;
  consumerState: ReferralConsumerState;
};

export type ReferralBindInput = {
  referralCode: string;
};

export type ReferralBindResult = {
  ok: true;
  bound: true;
};

export type ReferralShareResult = {
  shareCount: number;
  remaining: number;
};
