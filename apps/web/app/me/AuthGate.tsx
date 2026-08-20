import Link from "next/link";
import type { ReactNode } from "react";
import type { AccountSessionState } from "./useAccountSession";

export function AuthGate({
  state,
  children,
}: {
  state: AccountSessionState;
  children: ReactNode;
}) {
  if (state === "loading") {
    return <p>불러오는 중…</p>;
  }
  if (state === "guest" || state === "error") {
    return (
      <p>
        다시 로그인해 주세요. <Link href="/auth/login">로그인</Link>
      </p>
    );
  }
  return <>{children}</>;
}
