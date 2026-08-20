/**
 * B-FEED-001 Nest 소비면.
 * 분류는 balance-aware-feed · 참여 hide/cooldown/diversity만 여기서 노출.
 * Admin UI/세그먼트 CRUD = Track D (overlay만 받음).
 */

export type UserOpportunityFeedPolicyV1 = {
  hideSuccess: boolean;
  hideInProgress: boolean;
  cooldownSec: number;
  diversityMaxPerIdentity: number;
  maxFeedSlots: number;
};

export type FeedParticipation = {
  opportunityId: string;
  identityKey: string;
  status: string;
  updatedAtMs: number;
};

export type FeedPolicyCandidate = {
  id: string;
  identityKey?: string;
};

export type FeedExclude = {
  id: string;
  reason:
    | "PARTICIPATED_ACTIVE"
    | "IDENTITY_COOLDOWN"
    | "DIVERSITY_CAP"
    | "ALLOCATION_CAP";
};

export type FeedPolicySlice<T extends FeedPolicyCandidate> = {
  items: T[];
  excluded: FeedExclude[];
  policy: UserOpportunityFeedPolicyV1;
};

type UserOpportunityFeedPolicyRuntime = {
  POLICY_VERSION: "user-opportunity-feed-policy.v1";
  POLICY_OWNER: "engine:B-FEED-001";
  IN_PROGRESS_STATUSES: readonly ["running", "requeue"];
  SUCCESS_STATUS: "success";
  RETRYABLE_STATUSES: readonly ["safe_stop", "cancelled", "failed"];
  EXCLUDE_REASON: {
    PARTICIPATED_ACTIVE: "PARTICIPATED_ACTIVE";
    IDENTITY_COOLDOWN: "IDENTITY_COOLDOWN";
    DIVERSITY_CAP: "DIVERSITY_CAP";
    ALLOCATION_CAP: "ALLOCATION_CAP";
  };
  DEFAULT_USER_OPPORTUNITY_FEED_POLICY: UserOpportunityFeedPolicyV1;
  ADMIN_CONTROL_POINTER: {
    ownerTrack: "D";
    ui: "NOT_THIS_SLICE";
  };
  feedIdentityKey: (input: {
    canonicalProductId?: string | null;
    assetId?: string | null;
  }) => string;
  isParticipatedActive: (
    status: string,
    policy?: UserOpportunityFeedPolicyV1,
  ) => boolean;
  resolveUserOpportunityFeedPolicy: (input?: {
    overlay?: Partial<UserOpportunityFeedPolicyV1> | null;
  }) => UserOpportunityFeedPolicyV1;
  excludeParticipatedFromFeed: <T extends FeedPolicyCandidate>(input: {
    candidates: T[];
    participations: FeedParticipation[];
    nowMs: number;
    policy?: Partial<UserOpportunityFeedPolicyV1>;
  }) => FeedPolicySlice<T>;
  applyStableFeedCaps: <T extends FeedPolicyCandidate>(input: {
    candidates: T[];
    policy?: Partial<UserOpportunityFeedPolicyV1>;
  }) => FeedPolicySlice<T>;
  applyUserOpportunityFeedPolicy: <T extends FeedPolicyCandidate>(input: {
    candidates: T[];
    participations: FeedParticipation[];
    nowMs: number;
    policy?: Partial<UserOpportunityFeedPolicyV1>;
  }) => FeedPolicySlice<T>;
  recountFeedBuckets: (items: Array<{ bucket?: string; suggestDepositUsdt?: string }>) => {
    affordableCount: number;
    nearMissCount: number;
    lockedHighCount: number;
    topSuggestDepositUsdt: string | null;
  };
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const runtime = require("@aipo/market-intelligence/user-opportunity-feed-policy") as UserOpportunityFeedPolicyRuntime;

export const USER_OPPORTUNITY_FEED_POLICY_VERSION = runtime.POLICY_VERSION;
export const USER_OPPORTUNITY_FEED_POLICY_OWNER = runtime.POLICY_OWNER;
export const FEED_IN_PROGRESS_STATUSES = runtime.IN_PROGRESS_STATUSES;
export const FEED_SUCCESS_STATUS = runtime.SUCCESS_STATUS;
export const FEED_RETRYABLE_STATUSES = runtime.RETRYABLE_STATUSES;
export const FEED_EXCLUDE_REASON = runtime.EXCLUDE_REASON;
export const DEFAULT_USER_OPPORTUNITY_FEED_POLICY =
  runtime.DEFAULT_USER_OPPORTUNITY_FEED_POLICY;
export const FEED_ADMIN_CONTROL_POINTER = runtime.ADMIN_CONTROL_POINTER;

export const feedIdentityKey = runtime.feedIdentityKey;
export const isParticipatedActive = runtime.isParticipatedActive;
export const resolveUserOpportunityFeedPolicy =
  runtime.resolveUserOpportunityFeedPolicy;
export const excludeParticipatedFromFeed = runtime.excludeParticipatedFromFeed;
export const applyStableFeedCaps = runtime.applyStableFeedCaps;
export const applyUserOpportunityFeedPolicy =
  runtime.applyUserOpportunityFeedPolicy;
export const recountFeedBuckets = runtime.recountFeedBuckets;
