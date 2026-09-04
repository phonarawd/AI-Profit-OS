"use client";

import Link from "next/link";

/** 401/403 권한 없음 — 복사만 있는 막다른 길이 아니라 로그인으로 복구한다. */
export function WithdrawUnauthorizedNote() {
  return (
    <div className="mt-3" data-testid="withdraw-unauthorized" role="status">
      <p className="text-sm">로그인하면 출금을 신청할 수 있어요.</p>
      <p className="mt-2">
        <Link href="/auth/login" data-testid="withdraw-login-cta">
          로그인
        </Link>
      </p>
    </div>
  );
}
