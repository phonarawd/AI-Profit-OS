import { isAuthError } from "@aipo/sdk/auth";
import { isInboxError } from "@aipo/sdk/inbox";
import { isReferralError } from "@aipo/sdk/referral";

export function accountUserMessage(err: unknown): string {
  if (isAuthError(err)) {
    if (err.code === "AUTH_REQUIRED") return "다시 로그인해 주세요.";
    if (err.code === "VALIDATION_ERROR") return "입력한 내용을 다시 확인해 주세요.";
    if (err.status === 403) {
      return "지금은 탈퇴할 수 없어요. 남은 금액이 있으면 먼저 출금해 주세요.";
    }
  }
  if (isReferralError(err)) {
    if (err.code === "AUTH_REQUIRED") return "다시 로그인해 주세요.";
    if (err.code === "REFERRAL_DISABLED") {
      return "지금은 초대가 잠시 쉬고 있어요.";
    }
    if (err.code === "REFERRAL_CODE_INVALID") {
      return "초대 코드를 다시 확인해 주세요.";
    }
    if (err.code === "REFERRAL_SELF_FORBIDDEN") {
      return "내 코드는 연결할 수 없어요.";
    }
    if (err.code === "REFERRAL_ALREADY_BOUND") {
      return "이미 초대 코드가 연결되어 있어요.";
    }
    if (err.code === "REFERRAL_SHARE_LIMIT") {
      return "오늘은 공유를 조금 쉬어 주세요. 초대 수 제한은 아니에요.";
    }
  }
  if (isInboxError(err)) {
    if (err.code === "AUTH_REQUIRED") return "다시 로그인해 주세요.";
    if (err.code === "INBOX_NOT_FOUND") return "그 알림을 찾을 수 없어요.";
  }
  return "지금은 연결할 수 없어요. 다시 시도해 주세요.";
}

export function toPhoneE164(raw: string): string {
  const d = raw.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) return d;
  if (d.startsWith("82")) return `+${d}`;
  if (d.startsWith("0")) return `+82${d.slice(1)}`;
  return d ? `+82${d}` : "";
}

export async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
