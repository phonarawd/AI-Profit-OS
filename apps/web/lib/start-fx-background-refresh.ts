import {
  fetchCurrentFxApprox,
  type CurrentFxApproxRequest,
  type CurrentFxApproxResponse,
} from "@aipo/sdk/current-fx";
import { CURRENT_FX_REFRESH_MS } from "./current-fx-refresh";

export function startFxBackgroundRefresh(
  buildRequest: () => CurrentFxApproxRequest | null,
  onFx: (fx: CurrentFxApproxResponse) => void,
  signal: AbortSignal,
): void {
  const tick = () => {
    const req = buildRequest();
    if (!req) return;
    void fetchCurrentFxApprox(req, { signal })
      .then((fx) => {
        if (!signal.aborted) onFx(fx);
      })
      .catch(() => {
        /* keep previous KRW */
      });
  };
  tick();
  const id = window.setInterval(tick, CURRENT_FX_REFRESH_MS);
  signal.addEventListener("abort", () => window.clearInterval(id), {
    once: true,
  });
}
