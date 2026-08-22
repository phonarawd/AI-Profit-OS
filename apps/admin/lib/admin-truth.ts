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

/** 목록 형태가 아니면 빈 배열로 위조하지 않는다. */
export function asRecordList(value: unknown): Record<string, unknown>[] | null {
  const rows = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { items?: unknown }).items)
      ? (value as { items: unknown[] }).items
      : null;
  if (!rows) return null;
  if (!rows.every((row) => row && typeof row === "object" && !Array.isArray(row))) {
    return null;
  }
  return rows as Record<string, unknown>[];
}

/** 관측 비율. null·비숫자는 없음. 서버가 준 0만 0으로 표시. */
export function readRate(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return `${(value * 100).toFixed(2)}%`;
}

/** 시도 횟수가 없거나 0이면 비율 없음. 분모 없는 0 위조 금지. */
export function readObservedRate(
  rate: unknown,
  attempts: unknown,
): string | null {
  if (typeof attempts !== "number" || !Number.isFinite(attempts) || attempts <= 0) {
    return null;
  }
  return readRate(rate);
}
