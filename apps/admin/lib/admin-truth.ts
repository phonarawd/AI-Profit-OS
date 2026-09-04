import type { AdminFailure } from "./admin-api";
import { T } from "@aipo/ui/copy/ko";
export { maskLogPreview } from "./admin-log-mask";

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
  queued: "순서 대기",
  processing: "처리 중",
  active: "사용 중",
  enabled: "사용 중",
  inactive: "사용하지 않음",
  disabled: "사용하지 않음",
  matched: "연결됨",
  unmatched: "연결되지 않음",
  approved: "승인 완료",
  credited: "입금 반영 완료",
  completed: "처리 완료",
  resolved: "처리 완료",
  acked: "확인 완료",
  rejected: "반영하지 않음",
  failed: "처리 실패",
  error: "오류",
  frozen: "이용 멈춤",
  auto_frozen: "자동으로 이용 멈춤",
};

export function readStatusLabel(value: unknown): string | null {
  const text = readText(value);
  return text ? (STATUS_LABELS[text.toLowerCase()] ?? text) : null;
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
