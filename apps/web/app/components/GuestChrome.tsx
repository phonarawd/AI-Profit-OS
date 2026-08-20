import type { ReactNode } from "react";

/**
 * Guest 래퍼 — 5탭/Home geometry 0.
 * 시각 발명 없음. 기존 GuestChrome 제약만 보존.
 */
export function GuestChrome({ children }: { children: ReactNode }) {
  return (
    <div data-guest-chrome="true" data-bottom-nav="0">
      {children}
    </div>
  );
}
