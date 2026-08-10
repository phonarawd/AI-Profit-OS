import { T } from "../../copy/ko";

const DESKTOP_MEDIA = "(min-width: 768px)";
const BASE = "/brand/assets/ai";

/**
 * HomeHeroIllustration — Contract §3.5 (v1.3)
 * Brand-approved static illustration (AI 생성 → 검수 → Brand Kit 등재) · AVIF 1순위 → WebP 폴백.
 * Art-direction 분기: desktop(가로형 구도) / mobile(정방형 구도) — 동일 컨셉, 뷰포트별 별도 파일.
 * fetchPriority="high" — Hero는 항상 above-the-fold라 lazy 금지. 뷰포트별 LCP 후보가 갈리므로
 * (Next.js 16 가이드) next/image의 preload 대신 fetchPriority를 사용한다.
 */
export function HomeHeroIllustration({ className = "" }: { className?: string }) {
  return (
    <picture className={["home-hero__illustration-frame", className].filter(Boolean).join(" ")}>
      <source media={DESKTOP_MEDIA} type="image/avif" srcSet={`${BASE}/hero-illustration-desktop.avif`} />
      <source media={DESKTOP_MEDIA} type="image/webp" srcSet={`${BASE}/hero-illustration-desktop.webp`} />
      <source type="image/avif" srcSet={`${BASE}/hero-illustration-mobile.avif`} />
      <source type="image/webp" srcSet={`${BASE}/hero-illustration-mobile.webp`} />
      <img
        src={`${BASE}/hero-illustration-mobile.webp`}
        alt={T.home.hero.robotSlotAria}
        width={600}
        height={600}
        fetchPriority="high"
        decoding="async"
        data-testid="home-hero-illustration"
        className="h-full w-full object-contain"
      />
    </picture>
  );
}
