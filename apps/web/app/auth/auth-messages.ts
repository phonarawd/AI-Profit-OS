import { isAuthError } from "@aipo/sdk/auth";

export function authUserMessage(err: unknown): string {
  if (isAuthError(err)) {
    if (err.code === "TERMS_REQUIRED") return "약관에 동의해 주세요.";
    if (err.code === "AUTH_REQUIRED") return "다시 로그인해 주세요.";
    if (err.code === "KAKAO_UNAVAILABLE") {
      return "지금은 카카오로 연결할 수 없어요.";
    }
    if (err.code === "AGE_REQUIRED") {
      return "만 19세 이상만 이용할 수 있어요.";
    }
    if (err.code === "PHONE_INVALID") {
      return "휴대폰 번호를 다시 확인해 주세요.";
    }
    if (err.code === "NAME_INVALID") {
      return "표시 이름을 다시 확인해 주세요.";
    }
    if (err.code === "VALIDATION_ERROR") return "입력한 내용을 다시 확인해 주세요.";
    if (err.code === "FORBIDDEN_FIELD") return "필요한 내용만 입력해 주세요.";
    if (err.code === "TOO_MANY_REQUESTS") {
      return "요청이 많아요. 잠시 후 다시 시도해 주세요.";
    }
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
