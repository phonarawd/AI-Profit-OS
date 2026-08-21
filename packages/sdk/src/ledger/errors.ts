export type LedgerRequestCode =
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "NETWORK_ERROR"
  | "REQUEST_FAILED";

export class LedgerRequestError extends Error {
  readonly status: number;
  readonly code: LedgerRequestCode;

  constructor(status: number, body = "") {
    const code: LedgerRequestCode =
      status === 401
        ? "AUTH_REQUIRED"
        : status === 403
          ? "FORBIDDEN"
          : status === 404
            ? "NOT_FOUND"
            : status === 0
              ? "NETWORK_ERROR"
              : "REQUEST_FAILED";
    super(
      status === 0
        ? "ledger network"
        : `ledger HTTP ${status}${body ? `: ${body.slice(0, 200)}` : ""}`,
    );
    this.name = "LedgerRequestError";
    this.status = status;
    this.code = code;
  }
}

export function isLedgerRequestError(
  err: unknown,
): err is LedgerRequestError {
  return err instanceof LedgerRequestError;
}
