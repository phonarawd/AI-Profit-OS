"use client";

import Link from "next/link";
import { T } from "../../copy/ko";
import { HomeHeroIllustration } from "./HomeHeroIllustration";

export type HomeHeroProps = {
  className?: string;
  ctaHref?: string;
};

/**
 * HomeHero — STEP5 Slice2 · Contract §3 / Implementation §07
 * Copy/timeline/CTA = T.home.hero SSOT · 4단 · Reference 금지용어 0 · Fact/data-flow 0
 * Illustration ≤46% · Shell geometry(Slice1) 비침범
 */
export function HomeHero({
  className = "",
  ctaHref = T.home.hero.ctaHref,
}: HomeHeroProps) {
  const steps = T.home.hero.timeline;

  return (
    <section
      data-testid="home-hero"
      data-canon-block="hero"
      data-hero-timeline-steps={steps.length}
      className={["home-hero relative isolate overflow-hidden rounded-lux-xl", className]
        .filter(Boolean)
        .join(" ")}
    >
      <div aria-hidden className="home-hero__glow pointer-events-none absolute inset-0" />

      <div className="home-hero__inner relative z-10">
        <div className="home-hero__copy">
          <h1 className="home-hero__title text-balance font-semibold tracking-tight text-lux-surface">
            {T.home.hero.title}
          </h1>
          <p className="home-hero__subtitle text-pretty text-lux-surface/90">
            {T.home.hero.subtitle}
          </p>

          <ol
            aria-label={T.home.hero.timelineAria}
            data-testid="home-hero-timeline"
            className="home-hero__timeline"
          >
            {steps.map((step, i) => (
              <li key={step} className="home-hero__timeline-item">
                <span className="home-hero__timeline-index" aria-hidden>
                  {i + 1}
                </span>
                <span className="home-hero__timeline-label">{step}</span>
                {i < steps.length - 1 ? (
                  <span className="home-hero__timeline-arrow" aria-hidden>
                    →
                  </span>
                ) : null}
              </li>
            ))}
          </ol>

          <div className="home-hero__cta-wrap">
            <Link
              href={ctaHref}
              data-testid="home-hero-cta"
              data-cta="opportunity-confirm"
              className="home-hero__cta"
            >
              {T.home.hero.cta}
            </Link>
          </div>
        </div>

        <div className="home-hero__visual" data-testid="home-hero-visual-slots">
          <HomeHeroIllustration />
        </div>
      </div>
    </section>
  );
}
