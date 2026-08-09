import { toast, type ToastCode } from "../../copy/ko/toast";

export type ToastTone = "success" | "error" | "info";

export type ResolvedToast = {
  code: ToastCode;
  message: string;
  tone: ToastTone;
};

const ERROR_CODES = new Set<ToastCode>([
  "INSUFFICIENT_BALANCE",
  "KYC_REJECTED",
  "NETWORK_ERROR",
  "SESSION_EXPIRED",
  "ACCOUNT_FROZEN",
  "ACCOUNT_BANNED",
  "WITHDRAW_BLOCKED",
  "MATCH_BLOCKED",
  "WITHDRAW_APPLY_BLOCKED",
  "KRW_DEPOSIT_REJECTED",
  "DEPOSIT_DISPUTE_REJECTED",
  "RATE_LIMITED",
]);

/**
 * User toast resolver — §8.1/§8.2.
 * Never expose raw English codes / HTTP / stack to the surface.
 */
export function resolveToastDetail(
  code: ToastCode,
  vars?: Record<string, string | number>,
): ResolvedToast {
  let message: string = toast[code] ?? toast.NETWORK_ERROR;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      message = message.replaceAll(`{${k}}`, String(v));
    }
  }
  // Strip accidental English problem codes if a caller leaked them
  if (/^[A-Z][A-Z0-9_]{3,}$/.test(message.trim())) {
    message = toast.NETWORK_ERROR;
  }
  const tone: ToastTone = ERROR_CODES.has(code)
    ? "error"
    : code.startsWith("EXEC_") || code.includes("OK") || code.includes("CONFIRMED")
      ? "success"
      : "info";
  return { code, message, tone };
}

export function isToastCode(raw: string): raw is ToastCode {
  return Object.prototype.hasOwnProperty.call(toast, raw);
}
