/**
 * Execution transport boundary (Engine §0.9.2 · UI §29.6 / §30).
 * Phase0 = polling POST …/execute-tick
 * Phase1+ = SSE on the same TradeExecutionState contract (swap inside hook only)
 */

import type {
  ExecutionTransportKind,
  TradeExecutionState,
} from "./types";

export type ExecutionSubscribeOptions = {
  tradeId: string;
  apiBase: string;
  intervalMs: number;
  getAccessToken: () => string | null | Promise<string | null>;
  onState: (state: TradeExecutionState) => void;
  onError: (error: Error) => void;
};

export type TradeExecutionTransport = {
  readonly kind: ExecutionTransportKind;
  /**
   * Start streaming state updates. Returns unsubscribe (stop polling / close EventSource).
   * Call sites never see the channel difference.
   */
  subscribe(opts: ExecutionSubscribeOptions): () => void;
};

/**
 * Phase0 default. Flip to "sse" only after realtime-service ships —
 * call sites of useTradeExecution stay unchanged.
 */
export const DEFAULT_EXECUTION_TRANSPORT: ExecutionTransportKind = "polling";
