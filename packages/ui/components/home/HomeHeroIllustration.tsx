import { T } from "../../copy/ko";

const DESKTOP_MEDIA = "(min-width: 768px)";
const BASE = "/brand/assets/ai";

/**
 * HomeHeroIllustration — Contract §3.5 / STEP5 Slice2
 * Brand-approved static only · AVIF → WebP · WebGL/Three/런타임 생성 0
 * desktop 가로형 · mobile 정방형 · fetchPriority high (above-fold · lazy 금지)
 */
export function HomeHeroIllustration({ className = "" }: { className?: string }) {
  return (
    <picture
      className={["home-hero__illustration-frame", className]
        .filter(Boolean)
        .join(" ")}
    >
      <source
        media={DESKTOP_MEDIA}
        type="image/avif"
        srcSet={`${BASE}/hero-illustration-desktop.avif`}
      />
      <source
        media={DESKTOP_MEDIA}
        type="image/webp"
        srcSet={`${BASE}/hero-illustration-desktop.webp`}
      />
      <source type="image/avif" srcSet={`${BASE}/hero-illustration-mobile.avif`} />
      <source type="image/webp" srcSet={`${BASE}/hero-illustration-mobile.webp`} />
      <img
        src={`${BASE}/hero-illustration-mobile.webp`}
        alt={`${T.home.hero.robotSlotAria} · ${T.home.hero.globeSlotAria}`}
        width={600}
        height={400}
        fetchPriority="high"
        decoding="async"
        data-testid="home-hero-illustration"
        className="h-full w-full object-contain"
      />
    </picture>
  );
}
