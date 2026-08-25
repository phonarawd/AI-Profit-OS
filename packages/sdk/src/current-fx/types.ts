/**
 * POST /api/v1/me/current-fx/approx
 * DISPLAY_ONLY_INPUT. Raw FxSnapshot Consumer type is deferred.
 */

export type CurrentFxQuoteIn = {
  id: string;
  amountUsdt: string | null;
};

export type CurrentFxQuoteOut = {
  id: string;
  amountUsdt: string | null;
  amountKrw: string | null;
};

export type CurrentFxApproxRequest = {
  principalUsdt: string | null;
  withdrawableProfitUsdt: string | null;
  expectedProfitUsdt: string | null;
  quotes?: CurrentFxQuoteIn[];
};

export type CurrentFxStatus = "FRESH" | "STALE" | "UNAVAILABLE";

export type CurrentFxApproxResponse = {
  fxSnapshotId: string | null;
  capturedAt: string | null;
  principalKrwApprox: string | null;
  withdrawableProfitKrwApprox: string | null;
  expectedProfitKrwApprox: string | null;
  krwDisplayAvailable: boolean;
  fxStatus: CurrentFxStatus;
  quotes: CurrentFxQuoteOut[];
};

export type CurrentFxRequestOpts = {
  apiBase?: string;
  getAccessToken?: () => string | null | Promise<string | null>;
  signal?: AbortSignal;
};
