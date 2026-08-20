/**
 * POST /api/v1/me/current-fx/approx
 * DISPLAY_ONLY_INPUT. Raw FxSnapshot Consumer type is deferred.
 */

export type CurrentFxApproxRequest = {
  principalUsdt: string | null;
  withdrawableProfitUsdt: string | null;
  expectedProfitUsdt: string | null;
};

export type CurrentFxApproxResponse = {
  fxSnapshotId: string | null;
  capturedAt: string | null;
  principalKrwApprox: string | null;
  withdrawableProfitKrwApprox: string | null;
  expectedProfitKrwApprox: string | null;
};

export type CurrentFxRequestOpts = {
  apiBase?: string;
  getAccessToken?: () => string | null | Promise<string | null>;
  signal?: AbortSignal;
};
