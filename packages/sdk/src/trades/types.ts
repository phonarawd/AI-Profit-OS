/**
 * User trade list — B-TRADES-001
 * GET /api/v1/trades · 기존 TradeExecutionState 투영만.
 */

import type { TradeExecutionState } from "../execution-stream/types";

export type TradeListRequestOpts = {
  apiBase?: string;
  getAccessToken?: () => string | null | Promise<string | null>;
  signal?: AbortSignal;
};

export type TradeListResponse = {
  items: TradeExecutionState[];
};
