"use client";

/**
 * useTradeExecution — Live Scan hook boundary (UI §29.6 · §30 · Engine §0.9.2)
 *
 * Phase0: polling POST /api/v1/trades/:id/execute-tick
 * Phase1+: swap transport inside createExecutionTransport / DEFAULT only —
 *          AiProgressRoom and other call sites do not change.
 *
 * FORBIDDEN: RNG progress · client-invented stepIndex · fake timers as truth ·
 *            multiple EventSource · Phase0 import of the Phase1 stream package
 */

import { useEffect, useRef, useState } from "react";
import { detectDeviceTier, tierBatchMs } from "../device-tier";
import { createExecutionTransport } from "./create-transport";
import { DEFAULT_EXECUTION_TRANSPORT } from "./transport";
import {
  isTerminalExecutionStatus,
  type ExecutionTransportKind,
  type TradeExecutionState,
} from "./types";

export type UseTradeExecutionOptions = {
  tradeId: string | undefined | null;
  /** Nest API origin · empty = same-origin / Next rewrite */
  apiBase?: string;
  /** JWT from session — never trust body/query userId */
  getAccessToken: () => string | null | Promise<string | null>;
  /** Default true when tradeId is non-empty */
  enabled?: boolean;
  /**
   * Override transport. Default = DEFAULT_EXECUTION_TRANSPORT ("polling").
   * Phase1+ may pass "sse" once realtime-service is live.
   */
  transport?: ExecutionTransportKind;
  /** Override StreamPolicy executionTickMs (tests / admin diagnostics) */
  intervalMs?: number;
};

export type UseTradeExecutionResult = {
  state: TradeExecutionState | null;
  error: Error | null;
  /** Active channel — call sites may display diagnostics only */
  transport: ExecutionTransportKind;
  /** Polling / stream currently active */
  live: boolean;
  isTerminal: boolean;
};

export function useTradeExecution(
  opts: UseTradeExecutionOptions,
): UseTradeExecutionResult {
  const {
    tradeId,
    apiBase = "",
    getAccessToken,
    enabled = true,
    transport: transportKind = DEFAULT_EXECUTION_TRANSPORT,
    intervalMs: intervalOverride,
  } = opts;

  const [state, setState] = useState<TradeExecutionState | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [live, setLive] = useState(false);

  const getTokenRef = useRef(getAccessToken);
  getTokenRef.current = getAccessToken;

  useEffect(() => {
    if (!enabled || !tradeId) {
      setLive(false);
      return;
    }

    const tier = detectDeviceTier();
    const intervalMs =
      intervalOverride ?? tierBatchMs(tier).executionTickMs;

    const transport = createExecutionTransport(transportKind);
    setLive(true);
    setError(null);

    const stop = transport.subscribe({
      tradeId,
      apiBase,
      intervalMs,
      getAccessToken: () => getTokenRef.current(),
      onState: (next) => {
        setState(next);
        setError(null);
        if (isTerminalExecutionStatus(next.status)) {
          setLive(false);
        }
      },
      onError: (err) => {
        setError(err);
      },
    });

    return () => {
      stop();
      setLive(false);
    };
  }, [
    tradeId,
    apiBase,
    enabled,
    transportKind,
    intervalOverride,
  ]);

  return {
    state,
    error,
    transport: transportKind,
    live,
    isTerminal: isTerminalExecutionStatus(state?.status),
  };
}
