import { BrandMark } from "@aipo/ui/components/brand/BrandMark";
import { T } from "@aipo/ui/copy/ko";

const POINTS = [
  T.landing.guestUnderstandA,
  T.landing.guestUnderstandB,
  T.landing.guestUnderstandC,
] as const;

/**
 * REL-100 게스트 첫 방문 입구.
 * HomeDesktop/HomeMobile geometry를 바꾸지 않는다.
 * 마케팅 랜딩 발명이 아니라 가입/로그인으로 가는 최소 진실 입구.
 */
export function GuestFirstVisit() {
  return (
    <div
      data-testid="guest-first-visit"
      className="min-h-dvh bg-lux-bg px-4 py-10 sm:px-8 sm:py-16"
    >
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-3xl flex-col justify-center gap-8">
        <BrandMark size="hero" />
        <header className="space-y-3 text-center">
          <h1 className="text-2xl font-semibold leading-snug text-lux-text sm:text-4xl">
            {T.landing.identityOneLiner}
          </h1>
          <p className="text-base leading-relaxed text-lux-text-muted sm:text-lg">
            {T.landing.utilityDisclaimer}
          </p>
        </header>

        <ol className="grid list-none gap-3 p-0 sm:grid-cols-3">
          {POINTS.map((text, index) => (
            <li
              key={text}
              className="rounded-lux-md border border-lux-border bg-lux-surface px-4 py-4 text-center"
            >
              <p className="text-xs font-semibold text-lux-principal">
                {index + 1}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-lux-text sm:text-base">
                {text}
              </p>
            </li>
          ))}
        </ol>

        <div className="mx-auto flex w-full max-w-md flex-col gap-3">
          <a
            href="/auth/signup"
            data-testid="guest-cta-signup"
            className="touch-target flex items-center justify-center rounded-lux-md bg-lux-accent px-4 text-center font-semibold text-lux-bg"
          >
            {T.landing.ctaJoin}
          </a>
          <a
            href="/auth/login"
            data-testid="guest-cta-login"
            className="touch-target flex items-center justify-center rounded-lux-md border border-lux-border bg-lux-surface px-4 text-center font-semibold text-lux-text"
          >
            {T.landing.ctaLogin}
          </a>
        </div>

        <p className="text-center text-sm leading-relaxed text-lux-text-muted">
          {T.landing.transitionDisclosure}
        </p>
        <footer className="text-center text-xs text-lux-text-muted">
          {T.legal.operator.footerLine}
        </footer>
      </div>
    </div>
  );
}
