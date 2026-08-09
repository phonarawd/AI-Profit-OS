/** Fact tool names — mirrors @aipo/ai-platform FACT_TOOLS (read-only) */

export type FactToolName =
  | "getBalance"
  | "getBuckets"
  | "getDepositUsdt"
  | "getKrwDeposit"
  | "getOpportunity"
  | "getExecution"
  | "getKyc"
  | "getReferral"
  | "getCampaigns"
  | "getPractice"
  | "getUsdtGuide"
  | "searchHelp"
  | "getBenefitsSummary";

export type FactToolLoadResult = {
  tool: FactToolName;
  facts: Array<{
    source: string;
    payload?: Record<string, unknown>;
    captured_at?: string;
    expires_at?: string;
    confidence?: number;
    ttlSec?: number;
  }>;
};
