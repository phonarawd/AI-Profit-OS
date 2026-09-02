import type { ReactNode } from "react";

export type PermissionDeniedProps = {
  children: ReactNode;
  testId?: string;
};

/**
 * 권한 없음 공통 래퍼. 로그인/홈 복구 CTA는 호출측 카피를 유지한다.
 * RecoveryRetry를 넣지 않는다.
 */
export function PermissionDenied({
  children,
  testId = "permission-denied",
}: PermissionDeniedProps) {
  return (
    <section data-testid={testId} data-canon="permission-denied">
      {children}
    </section>
  );
}
