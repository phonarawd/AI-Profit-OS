/**
 * execute-tick HTTP 오류. 클라가 진행률을 만들지 않는다.
 */

export type TradeExecutionRequestCode =
  | "AUTH_REQUIRED"
  | "NOT_FOUND"
  | "NETWORK_ERROR"
  | "REQUEST_FAILED";

export class TradeExecutionRequestError extends Error {
  readonly status: number;
  readonly code: TradeExecutionRequestCode;

  constructor(status: number, body = "") {
    const code: TradeExecutionRequestCode =
      status === 401
        ? "AUTH_REQUIRED"
        : status === 404
          ? "NOT_FOUND"
          : status === 0
            ? "NETWORK_ERROR"
            : "REQUEST_FAILED";
    super(
      status === 0
        ? "execute-tick network"
        : `execute-tick HTTP ${status}${body ? `: ${body.slice(0, 200)}` : ""}`,
    );
    this.name = "TradeExecutionRequestError";
    this.status = status;
    this.code = code;
  }
}

export function isTradeExecutionRequestError(
  err: unknown,
): err is TradeExecutionRequestError {
  return err instanceof TradeExecutionRequestError;
}
