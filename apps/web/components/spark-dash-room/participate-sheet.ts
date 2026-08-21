/**
 * CUX-002 Participate Confirmation.
 * 상태값은 Nest participate/preflight에서 확인된 것만.
 * ALREADY_PARTICIPATING 는 백엔드 코드가 아니라 쓰지 않는다.
 */

export const CTA_DETAIL = "이 기회로 수익 벌기";
export const CTA_CONFIRM = "수익 벌기";
export const MAY_STOP = "시세가 움직이면 안전하게 멈출 수 있어요";
export const DISCLAIMER = "예상 결과는 시장 상황에 따라 달라질 수 있습니다.";

export const PHASE_CLOSED = "closed" as const;
export const PHASE_ISSUING = "PREFLIGHT_ISSUING" as const;
export const PHASE_READY = "PREFLIGHT_READY" as const;
export const PHASE_SUBMITTING = "SUBMITTING" as const;
export const PHASE_ACCEPTED = "ACCEPTED" as const;
export const PHASE_REUSED = "REUSED" as const;
export const PHASE_ERROR = "ERROR" as const;
export const CODE_PREFLIGHT_REQUIRED = "PREFLIGHT_REQUIRED" as const;

export type ParticipateSheetPhase =
  | "closed"
  | "PREFLIGHT_ISSUING"
  | "PREFLIGHT_READY"
  | "SUBMITTING"
  | "ACCEPTED"
  | "REUSED"
  | "ERROR";

export type ParticipateSheetErrorCode =
  | "PREFLIGHT_REQUIRED"
  | "INSUFFICIENT_PRINCIPAL"
  | "INSUFFICIENT_BALANCE"
  | "PRICE_STALE"
  | "PRICE_STALE_DATA"
  | "OPPORTUNITY_EXPIRED"
  | "MATCH_BLOCKED"
  | "COMPARE_NOT_READY"
  | "VALIDATION_ERROR"
  | "AUTH_REQUIRED"
  | "NETWORK_ERROR"
  | "CIRCUIT_OPEN"
  | "CAPITAL_BAND_LOCKED"
  | "DAILY_MATCH_CAP"
  | "NO_SLOTS"
  | "ACCOUNT_FROZEN";

export type ParticipateSheetRecovery =
  | "retry-confirm"
  | "deposit"
  | "list"
  | "login"
  | "close"
  | "execute";

export type ParticipateSheetCopy = {
  title: string;
  hint: string | null;
  primary: string;
  secondary: string;
  recovery: ParticipateSheetRecovery;
  busy: boolean;
  confirmEnabled: boolean;
};

const SECONDARY_CLOSE = "닫기";

export function isParticipateSheetErrorCode(
  code: string | null,
): code is ParticipateSheetErrorCode {
  return (
    code === "PREFLIGHT_REQUIRED" ||
    code === "INSUFFICIENT_PRINCIPAL" ||
    code === "INSUFFICIENT_BALANCE" ||
    code === "PRICE_STALE" ||
    code === "PRICE_STALE_DATA" ||
    code === "OPPORTUNITY_EXPIRED" ||
    code === "MATCH_BLOCKED" ||
    code === "COMPARE_NOT_READY" ||
    code === "VALIDATION_ERROR" ||
    code === "AUTH_REQUIRED" ||
    code === "NETWORK_ERROR" ||
    code === "CIRCUIT_OPEN" ||
    code === "CAPITAL_BAND_LOCKED" ||
    code === "DAILY_MATCH_CAP" ||
    code === "NO_SLOTS" ||
    code === "ACCOUNT_FROZEN"
  );
}

export function recoveryCopy(code: string | null, status: number): string {
  switch (code) {
    case "AUTH_REQUIRED":
      return "로그인이 필요해요.";
    case "PREFLIGHT_REQUIRED":
      return "확인을 다시 한 뒤 눌러 주세요.";
    case "INSUFFICIENT_PRINCIPAL":
    case "INSUFFICIENT_BALANCE":
      return "원금이 부족해요. 입금한 뒤 다시 시도해 주세요.";
    case "PRICE_STALE":
    case "PRICE_STALE_DATA":
      return "시세가 바뀌었어요. 목록에서 다시 확인해 주세요.";
    case "OPPORTUNITY_EXPIRED":
      return "이 기회는 이제 없어요.";
    case "MATCH_BLOCKED":
    case "COMPARE_NOT_READY":
    case "CIRCUIT_OPEN":
    case "CAPITAL_BAND_LOCKED":
    case "DAILY_MATCH_CAP":
    case "NO_SLOTS":
    case "ACCOUNT_FROZEN":
      return "지금은 이 기회로 수익을 벌 수 없어요.";
    case "VALIDATION_ERROR":
      return "필요 금액이 바뀌었어요. 다시 확인해 주세요.";
    case "NETWORK_ERROR":
      return "연결이 불안정해요. 다시 시도해 주세요.";
    default:
      if (status === 401) return "로그인이 필요해요.";
      if (status === 404) return "이 기회는 이제 없어요.";
      return "지금은 처리할 수 없어요. 잠시 후 다시 시도해 주세요.";
  }
}

export function sheetCopyFor(input: {
  phase: ParticipateSheetPhase;
  errorCode: string | null;
  errorStatus: number;
}): ParticipateSheetCopy {
  const { phase, errorCode, errorStatus } = input;
  if (phase === "PREFLIGHT_ISSUING") {
    return {
      title: "참여 조건을 확인하고 있어요",
      hint: "잠시만 기다려 주세요",
      primary: "확인 중",
      secondary: SECONDARY_CLOSE,
      recovery: "close",
      busy: true,
      confirmEnabled: false,
    };
  }
  if (phase === "SUBMITTING") {
    return {
      title: "참여를 확정하고 있어요",
      hint: "원금이 잠김으로 이동해요",
      primary: "확정 중",
      secondary: SECONDARY_CLOSE,
      recovery: "close",
      busy: true,
      confirmEnabled: false,
    };
  }
  if (phase === "ACCEPTED") {
    return {
      title: "참여가 확정됐어요",
      hint: "맞추는 화면으로 이동해요",
      primary: "진행 보기",
      secondary: SECONDARY_CLOSE,
      recovery: "execute",
      busy: true,
      confirmEnabled: false,
    };
  }
  if (phase === "REUSED") {
    return {
      title: "이미 이 기회로 참여했어요",
      hint: "진행 화면으로 이동해요",
      primary: "진행 보기",
      secondary: SECONDARY_CLOSE,
      recovery: "execute",
      busy: true,
      confirmEnabled: false,
    };
  }
  if (phase === "ERROR") {
    return sheetCopyForError(errorCode, errorStatus);
  }
  return {
    title: "이 금액으로 수익을 벌까요?",
    hint: null,
    primary: CTA_CONFIRM,
    secondary: SECONDARY_CLOSE,
    recovery: "close",
    busy: false,
    confirmEnabled: true,
  };
}

function sheetCopyForError(
  code: string | null,
  status: number,
): ParticipateSheetCopy {
  const title = recoveryCopy(code, status);
  if (code === "PREFLIGHT_REQUIRED") {
    return {
      title,
      hint: "확인 시간이 지났어요",
      primary: "다시 확인",
      secondary: SECONDARY_CLOSE,
      recovery: "retry-confirm",
      busy: false,
      confirmEnabled: true,
    };
  }
  if (code === "INSUFFICIENT_PRINCIPAL" || code === "INSUFFICIENT_BALANCE") {
    return {
      title,
      hint: "입금한 뒤 다시 시도해 주세요",
      primary: "입금하기",
      secondary: SECONDARY_CLOSE,
      recovery: "deposit",
      busy: false,
      confirmEnabled: true,
    };
  }
  if (code === "AUTH_REQUIRED" || status === 401) {
    return {
      title,
      hint: "로그인하면 이어서 확인할 수 있어요",
      primary: "로그인",
      secondary: SECONDARY_CLOSE,
      recovery: "login",
      busy: false,
      confirmEnabled: true,
    };
  }
  if (code === "VALIDATION_ERROR" || code === "NETWORK_ERROR") {
    return {
      title,
      hint: code === "NETWORK_ERROR" ? "다시 시도해 주세요" : "금액을 다시 확인해 주세요",
      primary: "다시 확인",
      secondary: SECONDARY_CLOSE,
      recovery: "retry-confirm",
      busy: false,
      confirmEnabled: true,
    };
  }
  return {
    title,
    hint:
      code === "OPPORTUNITY_EXPIRED"
        ? "다른 기회를 확인해 주세요"
        : "목록에서 다시 확인해 주세요",
    primary: "목록으로",
    secondary: SECONDARY_CLOSE,
    recovery: "list",
    busy: false,
    confirmEnabled: true,
  };
}

export function formatConfirmRemain(
  expiresAt: string | null,
  nowMs: number,
): string | null {
  if (!expiresAt) return null;
  const exp = Date.parse(expiresAt);
  if (!Number.isFinite(exp)) return null;
  const sec = Math.max(0, Math.ceil((exp - nowMs) / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function remainLabel(remain: string | null): string | null {
  return remain ? `확인 가능 시간 ${remain}` : null;
}

export type ParticipateSheetVisualKey =
  | "ready"
  | "issuing"
  | "submitting"
  | "accepted"
  | "reused"
  | "preflight_required"
  | "insufficient"
  | "stale"
  | "expired"
  | "blocked"
  | "auth";

export function visualKeyToSheet(key: ParticipateSheetVisualKey): {
  phase: ParticipateSheetPhase;
  errorCode: ParticipateSheetErrorCode | null;
  errorStatus: number;
  remain: string | null;
} {
  switch (key) {
    case "issuing":
      return { phase: "PREFLIGHT_ISSUING", errorCode: null, errorStatus: 0, remain: null };
    case "submitting":
      return { phase: "SUBMITTING", errorCode: null, errorStatus: 0, remain: null };
    case "accepted":
      return { phase: "ACCEPTED", errorCode: null, errorStatus: 0, remain: null };
    case "reused":
      return { phase: "REUSED", errorCode: null, errorStatus: 0, remain: null };
    case "preflight_required":
      return {
        phase: "ERROR",
        errorCode: "PREFLIGHT_REQUIRED",
        errorStatus: 412,
        remain: null,
      };
    case "insufficient":
      return {
        phase: "ERROR",
        errorCode: "INSUFFICIENT_PRINCIPAL",
        errorStatus: 403,
        remain: null,
      };
    case "stale":
      return { phase: "ERROR", errorCode: "PRICE_STALE", errorStatus: 409, remain: null };
    case "expired":
      return {
        phase: "ERROR",
        errorCode: "OPPORTUNITY_EXPIRED",
        errorStatus: 409,
        remain: null,
      };
    case "blocked":
      return { phase: "ERROR", errorCode: "MATCH_BLOCKED", errorStatus: 403, remain: null };
    case "auth":
      return { phase: "ERROR", errorCode: "AUTH_REQUIRED", errorStatus: 401, remain: null };
    default:
      return { phase: "PREFLIGHT_READY", errorCode: null, errorStatus: 0, remain: "4:59" };
  }
}

export function parseVisualSheetKey(
  raw: string | null | undefined,
): ParticipateSheetVisualKey | null {
  switch (raw) {
    case "ready":
    case "issuing":
    case "submitting":
    case "accepted":
    case "reused":
    case "preflight_required":
    case "insufficient":
    case "stale":
    case "expired":
    case "blocked":
    case "auth":
      return raw;
    default:
      return null;
  }
}
