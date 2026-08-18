/**
 * Phase1+ SSE transport skeleton — Engine §0.9.2 response-channel swap.
 *
 * When the Phase1 stream package ships, replace the body of `subscribe`
 * with EventSource on GET /api/v1/trades/:id/execution (or equivalent SSE
 * path). Rule evaluation + TradeExecutionState contract stay unchanged.
 *
 * Phase0: this file MUST NOT be the active default. Factory keeps
 * DEFAULT_EXECUTION_TRANSPORT = "polling". If somehow selected early,
 * fall back to polling so call sites never break.
 */

import { createPollingTransport } from "./polling-transport";
import type { TradeExecutionTransport } from "./transport";

/** Future SSE path (Nest may expose under trades/:id/execution) */
export const PHASE1_EXECUTION_SSE_PATH =
  "/api/v1/trades/:id/execution" as const;

export function createSseTransport(): TradeExecutionTransport {
  const pollingFallback = createPollingTransport();

  return {
    kind: "sse",
    subscribe(opts) {
      // Phase1 swap point:
      // const url = `${apiBase}/api/v1/trades/${tradeId}/execution`;
      // const es = new EventSource(url, { withCredentials: true });
      // es.addEventListener("trade.execution.step", …)
      // es.addEventListener("trade.execution.terminal", …)
      // return () => es.close();
      //
      // Until Phase1 stream package exists, reuse polling (same state contract).
      const stop = pollingFallback.subscribe({
        ...opts,
        onState: (state) => {
          opts.onState({ ...state, transport: "sse" });
        },
      });
      return stop;
    },
  };
}
