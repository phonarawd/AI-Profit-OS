"use client";

import { T } from "../../copy/ko";
import { BrandMark } from "../brand/BrandMark";
import { TouchButton } from "../lux/TouchButton";
import { LandingOperatorFooter } from "../shell/LandingOperatorFooter";
import { MarketPartnerTrustStrip } from "../trust/MarketPartnerTrustStrip";
import { emitLandingLeadIfConsented } from "./emitLandingLead";

export type LandingVariant = "meta" | "tt" | "google" | string;

export type Landing3sProps = {
  variant?: LandingVariant;
};

/**
 * Canon landing-3s — firstViewport ≤5 blocks
 * brand · identity · utilityDisclaimer · CTA→/onboarding · trust strip (Tier-A)
 * scroll: utilityDisclaimer 직상 footer + LandingOperatorFooter
 * Infra §31.2 · UI §6.4c.1 · /l/* canonical · /ads alias
 * Kakao OAuth = auth/onboarding 내부 only (랜딩 firstViewport 직행 0)
 * Lead emit = consentMarketing===true only (§6.4c.1 G)
 */
export function Landing3s({ variant = "meta" }: Landing3sProps) {
  const variants = T.landing.variants as Record<string, string>;
  const identity =
    (variant && variants[variant]) || T.landing.identityOneLiner;

  const openPriceMap = () => {
    emitLandingLeadIfConsented();
    window.location.href = "/onboarding";
  };

  return (
    <div
      data-testid="landing-3s"
      data-canon="landing-3s"
      data-variant={variant}
      className="flex flex-1 flex-col"
    >
      <main
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
            onClick={openPriceMap}
          >
            {T.landing.ctaOpenPriceMap}
          </TouchButton>
          {/* §6.4c.1 C #1 — CTA 직하 · opacity stack 0 */}
          <p
            className="text-center text-xs text-lux-text-muted"
            data-landing-disclaimer="cta"
          >
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

      {/* scroll — firstViewport 밖 */}
      <div data-landing-scroll="true" className="mt-10 space-y-3">
        {/* §6.4c.1 C #2 — LandingOperatorFooter 직상 */}
        <p
          className="text-center text-xs text-lux-text-muted"
          data-landing-disclaimer="pre-footer"
        >
          {T.landing.utilityDisclaimer}
        </p>
        <LandingOperatorFooter />
      </div>
    </div>
  );
}
