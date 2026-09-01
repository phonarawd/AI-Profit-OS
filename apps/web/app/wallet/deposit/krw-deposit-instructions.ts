/**
 * 유저 KRW 입금 안내 — 4필드만 ready. 자리표시 은행 발명 금지.
 */

export type SafeKrwDepositInstructions = {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  noticeKo: string;
};

export type KrwInstructionsView =
  | "loading"
  | "ready"
  | "unauthorized"
  | "unavailable";

const LEAKED_ADMIN_KEYS = [
  "hotWalletXpubRef",
  "treasuryHotAddressRef",
  "tronGridApiKey",
  "withdrawGuards",
  "pricingGuards",
  "usdtOnchain",
  "krwWithdrawFeeKrw",
  "configVersion",
] as const;

function trimNonBlank(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseSafeKrwDepositInstructions(
  raw: unknown,
): SafeKrwDepositInstructions | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  for (const key of LEAKED_ADMIN_KEYS) {
    if (Object.prototype.hasOwnProperty.call(o, key)) return null;
  }
  const bankName = trimNonBlank(o.bankName);
  const accountNumber = trimNonBlank(o.accountNumber);
  const accountHolder = trimNonBlank(o.accountHolder);
  if (!bankName || !accountNumber || !accountHolder) return null;
  if (typeof o.noticeKo !== "string") return null;
  return {
    bankName,
    accountNumber,
    accountHolder,
    noticeKo: o.noticeKo,
  };
}

export function classifyKrwInstructionsHttp(
  status: number,
): Exclude<KrwInstructionsView, "loading" | "ready"> {
  if (status === 401 || status === 403) return "unauthorized";
  return "unavailable";
}
