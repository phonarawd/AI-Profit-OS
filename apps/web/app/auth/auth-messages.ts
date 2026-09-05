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
    if (err.code === "USERNAME_INVALID_FORMAT") return "아이디 형식을 다시 확인해 주세요.";
    if (err.code === "USERNAME_RESERVED") return "다른 아이디를 입력해 주세요.";
    if (err.code === "USERNAME_TAKEN") return "이미 사용 중인 아이디예요.";
    if (err.code === "EMAIL_TAKEN") return "이미 가입된 이메일이에요.";
    if (err.code === "PASSWORD_TOO_SHORT" || err.code === "PASSWORD_TOO_LONG" || err.code === "PASSWORD_INVALID_LENGTH") {
      return "비밀번호는 15자 이상 128자 이하로 입력해 주세요.";
    }
    if (err.code === "PASSWORD_CONFIRM_MISMATCH") return "비밀번호가 서로 달라요.";
    if (err.code === "PASSWORD_PWNED") {
      return "유출된 적이 있는 비밀번호예요. 다른 비밀번호를 써주세요.";
    }
    if (err.code === "BIRTH_DATE_INVALID") return "생년월일을 다시 확인해 주세요.";
    if (err.code === "BIRTH_DATE_TOO_YOUNG") return "만 19세 이상만 가입할 수 있어요.";
    if (err.code === "DECLARED_NAME_INVALID") return "이름을 다시 확인해 주세요.";
    if (err.code === "INVALID_CREDENTIALS") {
      return "아이디, 이메일 또는 비밀번호를 확인해 주세요.";
    }
    if (err.code === "ACCOUNT_NOT_ACTIVE") return "지금은 이용할 수 없는 계정이에요.";
    if (err.code === "EMAIL_NOT_VERIFIED") {
      return "이메일 인증이 아직 끝나지 않았어요. 메일함을 확인해 주세요.";
    }
    if (err.code === "SIGNUP_LINK_INVALID" || err.code === "RESET_LINK_INVALID") {
      return "링크가 올바르지 않거나 이미 사용됐어요.";
    }
    if (err.code === "CURRENT_PASSWORD_INVALID") return "현재 비밀번호를 다시 확인해 주세요.";
    if (err.code === "TURNSTILE_FAILED" || err.code === "TURNSTILE_UNAVAILABLE") {
      return "사람인지 확인하는 절차에서 문제가 있었어요. 다시 시도해 주세요.";
    }
    if (err.code === "SERVICE_UNAVAILABLE" || err.code === "EMAIL_SEND_UNAVAILABLE") {
      return "지금은 처리할 수 없어요. 잠시 후 다시 시도해 주세요.";
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
