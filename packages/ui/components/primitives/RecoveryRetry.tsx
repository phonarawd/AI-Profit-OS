"use client";

import type { CSSProperties } from "react";
import { T } from "../../copy/ko";

export type RecoveryRetryProps = {
  onRetry: () => void;
  className?: string;
  style?: CSSProperties;
  testId?: string;
};

/**
 * D-3 회복 CTA. unavailable / offline / failure / retrying 전용.
 * permission_denied에는 쓰지 않는다.
 */
export function RecoveryRetry({
  onRetry,
  className,
  style,
  testId = "recovery-retry",
}: RecoveryRetryProps) {
  return (
    <button
      type="button"
      className={className}
      style={style}
      data-testid={testId}
      data-copy-key="common.retry"
      onClick={onRetry}
    >
      {T.common.retry}
    </button>
  );
}
