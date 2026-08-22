/**
 * Executable economics — Nest 소비면.
 * Money/Engine pricing·FX owner를 재사용하는 wiring만 노출한다.
 * Opportunity row INSERT / promotion persist 를 하지 않는다.
 */

export type ExecutableEconomicsDecision =
  | "EXECUTABLE"
  | "NOT_EXECUTABLE"
  | "INSUFFICIENT"
  | "CONFLICT"
  | "BLOCKED";

export type ExecutableEconomicsResult = {
  decision: ExecutableEconomicsDecision;
  reason: string;
  listingPromotion: boolean;
  promotionDecision: string;
  opportunity: false;
  observedPriceUsedAsExecutable: false;
  executablePrice: {
    buyUsdt: string;
    sellUsdt: string;
    buyChain: string;
    sellChain: string;
    fxSnapshotId: string;
  } | null;
  availability: {
    buy: string | null;
    sell: string | null;
    executable?: boolean;
  } | null;
  feesFx: {
    feesUsdt: string;
    expectedProfitUsdt: string;
    expectedProfitKrwApprox: string | null;
  } | null;
  evaluatorVersion: "executable-economics.v1";
  evaluatedAt: string;
};

type ExecutableEconomicsRuntime = {
  evaluateExecutableEconomics: (
    left: unknown,
    right: unknown,
    opts?: {
      now?: string;
      fxSnapshot?: unknown;
      buyListingId?: string;
      sellListingId?: string;
    },
  ) => ExecutableEconomicsResult;
  EVALUATOR_VERSION: "executable-economics.v1";
  PIPELINE_STATUS: {
    EXECUTABLE_PRICE_AVAIL_FEES_FX: "IN_PROCESS_MEMORY";
    MULTI_SOURCE_OPPORTUNITY_CREATION: "NOT_IMPLEMENTED";
  };
  EXECUTABLE_IS_NOT_OPPORTUNITY: true;
  DOES_NOT_CREATE_OPPORTUNITY: true;
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const runtime = require("@aipo/market-intelligence/executable-economics") as ExecutableEconomicsRuntime;

export const evaluateExecutableEconomics = runtime.evaluateExecutableEconomics;
export const EXECUTABLE_ECONOMICS_PIPELINE_STATUS = runtime.PIPELINE_STATUS;
export const EXECUTABLE_IS_NOT_OPPORTUNITY = runtime.EXECUTABLE_IS_NOT_OPPORTUNITY;
export const DOES_NOT_CREATE_OPPORTUNITY = runtime.DOES_NOT_CREATE_OPPORTUNITY;
