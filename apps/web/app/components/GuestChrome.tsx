import type { ReactNode } from "react";

/**
 * Guest 래퍼 — 5탭/Home geometry 0.
 * layout=narrow : auth 기본.
 * layout=viewport : 온보딩 전폭. 데스크톱을 모바일 카드로 강제하지 않는다.
 */
export function GuestChrome({
  children,
  layout = "narrow",
}: {
  children: ReactNode;
  layout?: "narrow" | "viewport";
}) {
  if (layout === "viewport") {
    return (
      <div
        data-testid="guest-chrome"
        data-layout="viewport"
        className="min-h-dvh bg-[#f7f8fb]"
      >
        {children}
      </div>
    );
  }
  return (
    <div
      data-testid="guest-chrome"
      className="fixed inset-0 z-50 overflow-y-auto bg-lux-bg"
    >
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-8 sm:px-6">
        {children}
      </div>
    </div>
  );
}
