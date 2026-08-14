export type EbayErrorClass =
  | "auth_failed"
  | "rate_limited"
  | "server_error"
  | "client_error"
  | "timeout"
  | "network_error"
  | "malformed_response"
  | "unknown";

export const DEFAULT_MAX_ATTEMPTS: number;
export const DEFAULT_TIMEOUT_MS: number;
export const DEFAULT_BASE_DELAY_MS: number;
export const DEFAULT_MAX_DELAY_MS: number;

export function classifyHttpStatus(
  status: number,
): "auth_failed" | "rate_limited" | "server_error" | "client_error" | "unknown";

export function classifyThrown(
  err: unknown,
): "timeout" | "network_error" | "malformed_response" | "unknown";

export function isRetryableErrorClass(errorClass: string): boolean;

export function backoffDelayMs(
  attemptIndex: number,
  opts?: { baseDelayMs?: number; maxDelayMs?: number },
): number;

export function applyFullJitter(
  delayMs: number,
  randomFn?: () => number,
): number;

export function shouldRetry(input: {
  attemptIndex: number;
  errorClass: string;
  maxAttempts?: number;
}): boolean;
