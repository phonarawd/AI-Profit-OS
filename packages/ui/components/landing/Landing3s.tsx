"use client";

import { T } from "../../copy/ko";
import { BrandMark } from "../brand/BrandMark";
import { TouchButton } from "../lux/TouchButton";
import { MarketPartnerTrustStrip } from "../trust/MarketPartnerTrustStrip";

export type LandingVariant = "meta" | "tt" | "google" | string;

export type Landing3sProps = {
  variant?: LandingVariant;
};

/**
 * Canon landing-3s — firstViewport ≤5 blocks
 * brand · identity · utilityDisclaimer · CTA→/onboarding · trust strip (Tier-A)
 * Infra §31.2 · UI §6.4c.1 · /l/* canonical · /ads alias
 * Kakao OAuth = auth/onboarding 내부 only (랜딩 firstViewport 직행 0)
 */
export function Landing3s({ variant = "meta" }: Landing3sProps) {
  const variants = T.landing.variants as Record<string, string>;
  const identity =
    (variant && variants[variant]) || T.landing.identityOneLiner;

  return (
    <main
      data-testid="landing-3s"
      data-canon="landing-3s"
      data-variant={variant}
      data-first-viewport-max="5"
      className="flex flex-1 flex-col justify-center gap-6"
    >
      {/* firstViewport block 1 — brand */}
      <div data-landing-block="brand">
        <BrandMark size="hero" />
      </div>

      {/* block 2 — identity */}
      <h1
        className="text-center text-xl font-semibold text-lux-text"
        data-landing-block="headline"
      >
        {identity}
      </h1>

      {/* block 3 — utility disclaimer */}
      <p
        className="text-center text-sm text-lux-text-muted"
        data-landing-block="reassure"
      >
        {T.landing.utilityDisclaimer}
      </p>

      {/* block 4 — primary CTA → onboarding (not Kakao) */}
      <div data-landing-block="cta" className="space-y-2">
        <TouchButton
          variant="primary"
          className="w-full"
          data-testid="landing-cta-price-map"
          onClick={() => {
            window.location.href = "/onboarding";
          }}
        >
          {T.landing.ctaOpenPriceMap}
        </TouchButton>
        <p className="text-center text-xs text-lux-text-muted">
          {T.landing.utilityDisclaimer}
        </p>
        <p className="text-center text-sm text-lux-text-muted">
          {T.landing.ctaHint}
        </p>
        <p className="text-center text-sm">
          <a
            href="/auth/login"
            className="text-lux-principal underline-offset-2 hover:underline"
          >
            {T.auth.loginHeadline}
          </a>
        </p>
      </div>

      {/* block 5 — trust (Tier-A logo strip) */}
      <div data-landing-block="trust">
        <MarketPartnerTrustStrip tier="A" />
      </div>
    </main>
  );
}
