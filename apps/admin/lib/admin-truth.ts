import type { AdminFailure } from "./admin-api";
import { T } from "@aipo/ui/copy/ko";

export const UNAVAILABLE_LABEL = "확인할 수 없음";

export function failureLabel(failure: AdminFailure): string {
  if (failure.kind === "unauthorized") return T.admin.state.unauthorized;
  if (failure.kind === "forbidden") return T.admin.state.forbidden;
  if (failure.kind === "not_found") return T.admin.state.notFound;
  if (failure.kind === "unavailable") return T.admin.state.unavailable;
  return T.admin.state.error;
}

/** missing ≠ 0. 빈 문자열·비문자 금액은 없음. */
export function readAmount(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text ? text : null;
}

/**
 * Money SSOT의 decimal string을 Number로 바꾸지 않고 표시용으로만 정리한다.
 * 원장/계산 정밀도는 건드리지 않고, 화면에서만 지정 자릿수로 반올림한다.
 */
export function formatDecimalString(
  value: unknown,
  maxFractionDigits = 2,
): string | null {
  const raw = readAmount(value);
  if (!raw || !/^-?\d+(?:\.\d+)?$/.test(raw)) return null;
  const negative = raw.startsWith("-");
  const unsigned = negative ? raw.slice(1) : raw;
  let [integer, fraction = ""] = unsigned.split(".");
  integer = integer.replace(/^0+(?=\d)/, "") || "0";

  const digits = Math.max(0, Math.min(8, Math.trunc(maxFractionDigits)));
  if (fraction.length > digits) {
    const kept = fraction.slice(0, digits);
    const shouldRound = Number(fraction[digits] ?? "0") >= 5;
    if (shouldRound) {
      const scale = BigInt(10) ** BigInt(digits);
      const base = BigInt(integer) * scale + BigInt(kept || "0");
      const rounded = base + BigInt(1);
      integer = (rounded / scale).toString();
      fraction = digits > 0 ? (rounded % scale).toString().padStart(digits, "0") : "";
    } else {
      fraction = kept;
    }
  }

  fraction = fraction.slice(0, digits).replace(/0+$/, "");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const sign = negative && (integer !== "0" || fraction) ? "-" : "";
  return `${sign}${grouped}${fraction ? `.${fraction}` : ""}`;
}

export function formatUsdt(value: unknown): string | null {
  const amount = formatDecimalString(value, 2);
  return amount ? `${amount} 테더` : null;
}

export function formatPercent(value: unknown, fractionDigits = 1): string | null {
  const raw = readText(value);
  if (!raw || !/^-?\d+(?:\.\d+)?$/.test(raw)) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return `${n.toFixed(Math.max(0, Math.min(2, fractionDigits)))}%`;
}

export function formatDateTimeKo(value: unknown): string | null {
  const raw = readText(value);
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function maskEmail(value: unknown): string | null {
  const raw = readText(value);
  if (!raw || !raw.includes("@")) return raw;
  const [local, domain] = raw.split("@");
  const visible = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  return `${visible}${"•".repeat(Math.max(2, local.length - visible.length))}@${domain}`;
}

export function maskPhone(value: unknown): string | null {
  const raw = readText(value);
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7) return raw;
  return `${raw.slice(0, 4)}••••${digits.slice(-4)}`;
}

export function readText(value: unknown): string | null {
  if (typeof value === "string") {
    const text = value.trim();
    return text ? text : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "boolean") return value ? "켜짐" : "꺼짐";
  return null;
}

const STATUS_LABELS: Record<string, string> = {
  open: "확인 대기",
  pending: "확인 대기",
  pending_review: "확인 대기",
  manual_review: "직접 확인 필요",
  queued: "순서 대기",
  processing: "처리 중",
  active: "사용 중",
  enabled: "사용 중",
  available: "진행 가능",
  inactive: "사용하지 않음",
  disabled: "사용하지 않음",
  paused: "잠시 멈춤",
  draft: "작성 중",
  confirmed: "확인 완료",
  auth_ok: "본인 확인 완료",
  ledger_posted: "원장 반영 완료",
  broadcasting: "전송 중",
  matched: "연결됨",
  unmatched: "연결되지 않음",
  approved: "승인 완료",
  credited: "입금 반영 완료",
  completed: "처리 완료",
  resolved: "처리 완료",
  acked: "확인 완료",
  rejected: "반영하지 않음",
  expired: "기간 만료",
  failed: "처리 실패",
  failed_refund_buckets: "실패 · 반환 확인 필요",
  error: "오류",
  frozen: "이용 멈춤",
  auto_frozen: "자동으로 이용 멈춤",
  banned: "이용 정지",
  deleted: "탈퇴 처리",
  none: "미제출",
  seen: "입금 감지",
  ui_confirmed: "회원 확인",
  swept: "회수 완료",
  ignored: "반영 제외",
};

export function readStatusLabel(value: unknown): string | null {
  const text = readText(value);
  return text ? (STATUS_LABELS[text.toLowerCase()] ?? text) : null;
}

export function statusTone(value: unknown): "good" | "warn" | "danger" | "neutral" {
  const text = readText(value)?.toLowerCase();
  if (!text) return "neutral";
  if (["active", "enabled", "available", "approved", "credited", "completed", "resolved", "acked", "matched", "ledger_posted", "swept"].includes(text)) return "good";
  if (["rejected", "failed", "failed_refund_buckets", "error", "frozen", "auto_frozen", "banned", "deleted"].includes(text)) return "danger";
  if (["pending", "pending_review", "manual_review", "queued", "processing", "paused", "draft", "auth_ok", "broadcasting", "seen", "ui_confirmed"].includes(text)) return "warn";
  return "neutral";
}

const JOURNAL_LABELS: Record<string, string> = {
  deposit_usdt: "테더 입금",
  deposit_krw: "원화 입금",
  withdraw: "출금",
  withdraw_refund: "출금 취소 금액 반환",
  participate_lock: "수익 진행 금액 보관",
  participate_unlock: "보관 금액 해제",
  settlement: "수익 지급",
  merge_profit_to_principal: "수익을 원금으로 옮김",
  admin_adjust: "관리자 확인 반영",
  referral_reward: "친구 초대 혜택 지급",
  referral_clawback: "친구 초대 혜택 회수",
  practice_grant: "연습 잔액 지급",
  practice_expire: "연습 잔액 만료",
  mission_reward: "활동 혜택 지급",
  mission_clawback: "활동 혜택 회수",
  fee: "수수료",
  other: "기타",
};

export function readMoneyRecordLabel(value: unknown): string | null {
  const text = readText(value);
  return text ? (JOURNAL_LABELS[text.toLowerCase()] ?? text) : null;
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

/** Admin log preview — resident/phone/token raw 0 */
export function maskLogPreview(value: unknown): string | null {
  const text = readText(value);
  if (!text) return null;
  return text
    .replace(/\b\d{6}-?\d{7}\b/g, "[숨김]")
    .replace(/\b01[016789]-?\d{3,4}-?\d{4}\b/g, "[숨김]")
    .replace(/\bBearer\s+\S+/gi, "Bearer [숨김]")
    .replace(/\bsk-[A-Za-z0-9]{8,}\b/g, "[숨김]")
    .replace(
      /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
      "[숨김]",
    );
}
