/**
 * Thin bridge to @aipo/market-intelligence HomeReadModelV1 mapper.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mi = require("@aipo/market-intelligence") as {
  mapHomeReadModelV1: (input: Record<string, unknown>) => Record<string, unknown>;
  deriveTodayPossibleProfitUsdt: (items: unknown[]) => string;
  assertNoFakeZeroHomeRead: (dto: Record<string, unknown>) => true;
  TODAY_POSSIBLE_DERIVATION_ID: string;
  HOME_VIEW_STATES_SERVER: readonly string[];
};

export const mapHomeReadModelV1 = mi.mapHomeReadModelV1;
export const deriveTodayPossibleProfitUsdt = mi.deriveTodayPossibleProfitUsdt;
export const assertNoFakeZeroHomeRead = mi.assertNoFakeZeroHomeRead;
export const TODAY_POSSIBLE_DERIVATION_ID = mi.TODAY_POSSIBLE_DERIVATION_ID;
export const HOME_VIEW_STATES_SERVER = mi.HOME_VIEW_STATES_SERVER;
