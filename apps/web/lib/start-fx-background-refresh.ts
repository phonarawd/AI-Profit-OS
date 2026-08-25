import {
  fetchCurrentFxApprox,
  type CurrentFxApproxRequest,
  type CurrentFxApproxResponse,
} from "@aipo/sdk/current-fx";
import { CURRENT_FX_REFRESH_MS } from "./current-fx-refresh";

const FX_REFRESH_UNAVAILABLE: CurrentFxApproxResponse = {
  fxSnapshotId: null,
  capturedAt: null,
  principalKrwApprox: null,
  withdrawableProfitKrwApprox: null,
  expectedProfitKrwApprox: null,
  krwDisplayAvailable: false,
  fxStatus: "UNAVAILABLE",
  quotes: [],
};

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
        // Transport/API failure must not leave a previously rendered KRW
        // amount on screen indefinitely. USDT remains authoritative; KRW
        // fails closed until a later successful refresh restores a valid
        // FRESH/STALE snapshot.
        if (!signal.aborted) onFx(FX_REFRESH_UNAVAILABLE);
      });
  };
  tick();
  const id = window.setInterval(tick, CURRENT_FX_REFRESH_MS);
  signal.addEventListener("abort", () => window.clearInterval(id), {
    once: true,
  });
}
