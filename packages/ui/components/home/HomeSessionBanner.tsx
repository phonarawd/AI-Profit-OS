"use client";

import Link from "next/link";
import { T } from "../../copy/ko";

export type HomeSessionBannerProps = {
  /** guest = 미로그인 · expired = 세션 만료(401) */
  kind: "guest" | "expired";
  className?: string;
};

/**
 * 홈 세션 안내 — toast 카피 인라인 링크 대체 · peotteok-light surface
 */
export function HomeSessionBanner({
  kind,
  className = "",
}: HomeSessionBannerProps) {
  const copy =
    kind === "guest"
      ? {
          title: T.home.session.guestTitle,
          body: T.home.session.guestBody,
          cta: T.home.session.guestCta,
        }
      : {
          title: T.home.session.expiredTitle,
          body: T.home.session.expiredBody,
          cta: T.home.session.expiredCta,
        };

  return (
    <aside
      role="status"
      data-testid={
        kind === "guest" ? "home-session-guest" : "home-session-expired"
      }
      data-session-banner={kind}
      className={[
        "mx-4 mt-3 rounded-pd-xl border border-pd-border bg-pd-surface p-4 shadow-[var(--shadow-pd-soft)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <p className="text-sm font-semibold text-pd-text">{copy.title}</p>
      <p className="mt-1 text-sm text-pd-text-muted">{copy.body}</p>
      <Link
        href="/auth/login"
        className="mt-3 inline-flex min-h-12 items-center justify-center rounded-pd-md bg-pd-accent px-4 py-2 text-sm font-semibold text-pd-surface"
      >
        {copy.cta}
      </Link>
    </aside>
  );
}
