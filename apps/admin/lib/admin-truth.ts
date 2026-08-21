import type { AdminFailure } from "./admin-api";

export const UNAVAILABLE_LABEL = "확인할 수 없음";

export function failureLabel(failure: AdminFailure): string {
  if (failure.kind === "unauthorized") return "운영 권한이 필요합니다";
  if (failure.kind === "forbidden") return "이 작업을 할 권한이 없습니다";
  if (failure.kind === "not_found") return "찾을 수 없음";
  if (failure.kind === "unavailable") return UNAVAILABLE_LABEL;
  return "요청을 처리할 수 없음";
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

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}
