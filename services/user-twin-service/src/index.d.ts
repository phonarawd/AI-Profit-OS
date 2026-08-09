/** Engine §47 User Twin — money Fact cache FORBIDDEN */

export const FORBIDDEN_TWIN_MONEY_KEYS: readonly [
  "balanceUsdt",
  "expectedProfitUsdt",
  "liveQuote",
];
export const CAPITAL_BANDS: readonly string[];
export const TONE_BANDS: readonly ["young", "mid", "senior"];
export const CATEGORIES: readonly ["watch", "trading_card", "luxury_bag"];
export const TWIN_REDIS_PREFIX: "ai:twin:";
export const TWIN_REDIS_TTL_SEC: 3600;

export type UserTwin = {
  readonly schema: "user-twin.v1";
  readonly userId: string;
  readonly preferredCapitalBand: string | null;
  readonly categoryInterest: readonly string[];
  readonly toneBand: string | null;
  readonly objectionPatterns: readonly string[];
  readonly twinSnapshotId: string;
  readonly updatedAt: string;
};

export function findForbiddenMoneyKeys(
  obj: Record<string, unknown> | null | undefined,
): string[];
export function assertNoTwinMoneyKeys(
  obj: Record<string, unknown> | null | undefined,
): void;
export function twinRedisKey(userId: string): string;
export function buildTwin(input?: object): UserTwin;
export function patchTwin(base: object | null, patch?: object): UserTwin;
export type AiUserProfileRow = {
  readonly user_id: string;
  readonly preferred_capital_band: string | null;
  readonly category_interest: readonly string[];
  readonly tone_band: string | null;
  readonly objection_patterns: readonly string[];
  readonly twin_snapshot_id: string;
  readonly payload: Record<string, never>;
  readonly updated_at: string;
};

export function toAiUserProfileRow(twin: UserTwin): AiUserProfileRow;
export function fromAiUserProfileRow(row: object | null): UserTwin | null;
export function resolveMoneyFromTwin(
  twin: object | null | undefined,
  field: string,
): never;
export function assertTwinNotUsedForMoneyAnswer(
  usedTwinForMoney: boolean,
): void;
