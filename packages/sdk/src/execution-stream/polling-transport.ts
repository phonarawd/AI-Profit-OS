/**
 * Phase0 Live Scan transport — POST /api/v1/trades/:id/execute-tick
 * Soft60/Hard90 / REQUEUE / MATCH_TIMEOUT are server Rule facts · no client RNG.
 */

import type { TradeExecutionTransport } from "./transport";
import {
  isTerminalExecutionStatus,
  type TradeExecutionState,
} from "./types";

function joinUrl(apiBase: string, path: string): string {
  const base = apiBase.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

async function readState(
  res: Response,
): Promise<TradeExecutionState> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `execute-tick HTTP ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
    );
  }
  return (await res.json()) as TradeExecutionState;
}

export function createPollingTransport(): TradeExecutionTransport {
  return {
    kind: "polling",
    subscribe(opts) {
      let stopped = false;
      let inFlight = false;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const clearTimer = () => {
        if (timer != null) {
          clearTimeout(timer);
          timer = null;
        }
      };

      const schedule = (ms: number) => {
        clearTimer();
        if (stopped) return;
        timer = setTimeout(() => {
          void tick();
        }, ms);
      };

      const tick = async () => {
        if (stopped || inFlight) return;
        inFlight = true;
        try {
          const token = await opts.getAccessToken();
          if (!token) {
            // Auth not ready — wait without fabricating progress
            schedule(opts.intervalMs);
            return;
          }

          const res = await fetch(
            joinUrl(
              opts.apiBase,
              `/api/v1/trades/${encodeURIComponent(opts.tradeId)}/execute-tick`,
            ),
            {
              method: "POST",
              headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
              },
              cache: "no-store",
            },
          );
          const state = await readState(res);
          if (stopped) return;
          opts.onState({ ...state, transport: "polling" });
          if (isTerminalExecutionStatus(state.status)) {
            stopped = true;
            clearTimer();
            return;
          }
          schedule(opts.intervalMs);
        } catch (err) {
          if (stopped) return;
          opts.onError(
            err instanceof Error ? err : new Error(String(err)),
          );
          // Back off with the same StreamPolicy band (no fake progress)
          schedule(opts.intervalMs);
        } finally {
          inFlight = false;
        }
      };

      // Immediate first tick — Soft60 clock is server-side
      void tick();

      return () => {
        stopped = true;
        clearTimer();
      };
    },
  };
}
