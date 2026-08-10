"use client";

import Link from "next/link";
import { T } from "../../copy/ko";
import { HomeHeroIllustration } from "./HomeHeroIllustration";

export type HomeHeroProps = {
  className?: string;
  ctaHref?: string;
};

/**
 * HomeHero — Contract §3 (v1.3)
 * Desktop 480–600 · illustration ~46% · robot/globe = brand-approved static illustration
 */
export function HomeHero({
  className = "",
  ctaHref = "#home-opportunity",
}: HomeHeroProps) {
  return (
    <section
      data-testid="home-hero"
      data-canon-block="hero"
      className={[
        "home-hero relative isolate overflow-hidden rounded-lux-xl px-6 py-8 md:px-10 md:py-12",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div aria-hidden className="home-hero__glow pointer-events-none absolute inset-0" />

      <div className="relative z-10 flex h-full min-h-[inherit] flex-col justify-center gap-8 md:flex-row md:items-center md:gap-10">
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-5 md:max-w-[54%]">
          <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-lux-surface md:text-4xl lg:text-[2.75rem]">
            {T.home.hero.title}
          </h1>
          <p className="max-w-[36rem] text-pretty text-base leading-relaxed text-lux-surface/90 md:text-lg">
            {T.home.hero.subtitle}
          </p>

          <ol
            aria-label={T.home.hero.timelineAria}
            data-testid="home-hero-timeline"
            className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
          >
            {T.home.hero.timeline.map((step, i) => (
              <li
                key={step}
                className="flex items-center gap-2 text-sm text-lux-surface/95"
              >
                <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-lux-surface/15 px-2 text-xs font-semibold tabular-nums">
                  {i + 1}
                </span>
                <span className="font-medium">{step}</span>
                {i < T.home.hero.timeline.length - 1 ? (
                  <span
                    aria-hidden
                    className="mx-1 hidden text-lux-surface/40 sm:inline"
                  >
                    →
                  </span>
                ) : null}
              </li>
            ))}
          </ol>

          <div>
            <Link
              href={ctaHref}
              data-testid="home-hero-cta"
              data-cta="opportunity-confirm"
              className="inline-flex min-h-12 items-center justify-center rounded-lux-md bg-lux-surface px-6 py-3 text-base font-semibold text-lux-accent shadow-[var(--shadow-lux-card)] transition-transform duration-200 hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100"
            >
              {T.home.hero.cta}
            </Link>
          </div>
        </div>

        <div
          className="relative mx-auto w-full max-w-[280px] shrink-0 md:mx-0 md:w-[min(46%,420px)] md:max-w-[46%]"
          data-testid="home-hero-visual-slots"
        >
          <HomeHeroIllustration />
        </div>
      </div>
    </section>
  );
}
