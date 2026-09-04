/**
 * Phase0 Live Scan transport — POST /api/v1/trades/:id/execute-tick
 * Soft60/Hard90 / REQUEUE / MATCH_TIMEOUT are server Rule facts · no client RNG.
 * 세션 = httpOnly 쿠키 또는 Bearer. 토큰 없으면 틱을 건너뛰지 않는다.
 */

import { TradeExecutionRequestError } from "./errors";
import type { TradeExecutionTransport } from "./transport";
import {
  isTerminalExecutionStatus,
  type TradeExecutionState,
} from "./types";

function joinUrl(apiBase: string, path: string): string {
  let base = String(apiBase || "");
  while (base.endsWith("/")) base = base.slice(0, -1);
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

async function readState(
  res: Response,
): Promise<TradeExecutionState> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new TradeExecutionRequestError(res.status, body);
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
          const headers: Record<string, string> = {
            Accept: "application/json",
          };
          if (token) {
            headers.Authorization = `Bearer ${token}`;
          }

          const res = await fetch(
            joinUrl(
              opts.apiBase,
              `/api/v1/trades/${encodeURIComponent(opts.tradeId)}/execute-tick`,
            ),
            {
              method: "POST",
              headers,
              credentials: "include",
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
          const next =
            err instanceof TradeExecutionRequestError
              ? err
              : err instanceof Error
                ? err
                : new TradeExecutionRequestError(0);
          opts.onError(next);
          if (
            next instanceof TradeExecutionRequestError &&
            (next.status === 401 || next.status === 404)
          ) {
            stopped = true;
            clearTimer();
            return;
          }
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
