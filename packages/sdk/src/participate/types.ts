/**
 * Participate / preflight client — B-PARTICIPATION-001
 * Nest 계약만 전달. 금액 재계산 · userId body 금지.
 */

export type ParticipateRequestOpts = {
  apiBase?: string;
  getAccessToken?: () => string | null | Promise<string | null>;
  signal?: AbortSignal;
};

export type PreflightResponse = {
  preflightToken: string;
  expiresAt: string;
  mayStopRequired: true;
};

export type ParticipateRequestBody = {
  opportunityId: string;
  pricingVersion: number;
  minProfitUsdt: string;
  amountUsdt: string;
  idempotencyKey: string;
  preflightToken: string;
};

export type ParticipateResult = {
  ok: true;
  participateRequestId: string;
  tradeId: string;
  opportunityId: string;
  pricingVersion: number;
  expectedProfitUsdt: string;
  amountUsdt: string;
  status: "accepted";
  tradeStatus: "running";
  reused: boolean;
  priceSoftAccept: boolean;
};

export class ParticipateError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(status: number, code: string | null, message?: string) {
    super(message ?? code ?? `participate_${status}`);
    this.name = "ParticipateError";
    this.status = status;
    this.code = code;
  }
}

export function isParticipateError(err: unknown): err is ParticipateError {
  return err instanceof ParticipateError;
}
