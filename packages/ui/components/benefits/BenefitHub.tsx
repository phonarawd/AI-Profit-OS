"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { T } from "../../copy/ko";
import { DemoWalletBanner } from "../wallet/DemoWalletBanner";
import { BenefitMissionCard } from "./BenefitMissionCard";
import type {
  BenefitCampaignSlide,
  BenefitMissionCardModel,
  BenefitSummaryModel,
} from "./benefit-types";

export type BenefitHubProps = {
  summary?: BenefitSummaryModel | null;
  sections?: {
    daily?: BenefitMissionCardModel[];
    oneTime?: BenefitMissionCardModel[];
    weekly?: BenefitMissionCardModel[];
    streak?: BenefitMissionCardModel[];
  } | null;
  /** Admin campaign live · Money §51.5b mirror · 1~3 */
  campaigns?: BenefitCampaignSlide[] | null;
  /** practice 배너 — practice 보상 카드가 있을 때만 기본 노출 */
  showPracticeBanner?: boolean;
  className?: string;
};

function msUntilKstMidnight(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) =>
    Number(parts.find((p) => p.type === t)?.value ?? "0");
  const y = get("year");
  const m = get("month");
  const d = get("day");
  const h = get("hour");
  const mi = get("minute");
  const s = get("second");
  const elapsed = ((h * 60 + mi) * 60 + s) * 1000;
  const dayMs = 24 * 60 * 60 * 1000;
  return dayMs - elapsed;
}

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function formatKrwOrUsdt(
  usdt: string,
  krwApprox?: string | null,
): string {
  if (krwApprox && krwApprox.trim()) {
    return T.benefits.rewardKrwApprox.replace(
      "{amount}",
      krwApprox.trim(),
    );
  }
  const amt = (usdt || "0").trim() || "0";
  return `${amt} ${T.benefits.rewardUsdtSuffix}`;
}

function renderMissionCards(cards: BenefitMissionCardModel[]) {
  if (cards.length === 0) {
    return (
      <p className="text-sm text-lux-text-muted" role="status">
        {T.benefits.sectionEmpty}
      </p>
    );
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {cards.map((card) => (
        <li key={card.missionId}>
          <BenefitMissionCard card={card} />
        </li>
      ))}
    </ul>
  );
}

/**
 * UI §5.9.5 Benefit Hub — Hero · Carousel · Daily/One-Time/Weekly/Streak
 * Credits 화폐 0 · G4/demo Hero 합산 0 · Money/Engine/Admin pointer only
 */
export function BenefitHub({
  summary = null,
  sections = null,
  campaigns = null,
  showPracticeBanner,
  className = "",
}: BenefitHubProps) {
  const [resetMs, setResetMs] = useState(() => msUntilKstMidnight());

  useEffect(() => {
    const id = window.setInterval(() => {
      setResetMs(msUntilKstMidnight());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const rewardsEnabled = summary?.rewardsEnabled === true;
  const claimable = summary?.claimableCount ?? 0;
  const pending = summary?.pendingHoldCount ?? 0;
  const monthLabel = formatKrwOrUsdt(
    summary?.releasedMonthUsdt ?? "0",
    summary?.releasedMonthKrwApprox,
  );

  const daily = sections?.daily ?? [];
  const oneTime = sections?.oneTime ?? [];
  const weekly = sections?.weekly ?? [];
  const streak = sections?.streak ?? [];

  const allCards = useMemo(
    () => [...daily, ...oneTime, ...weekly, ...streak],
    [daily, oneTime, weekly, streak],
  );

  const educationCount = useMemo(() => {
    return allCards.filter(
      (c) =>
        c.rewardKind === "none" ||
        c.status === "available" ||
        c.status === "in_progress",
    ).length;
  }, [allCards]);

  const hasPracticeReward = allCards.some(
    (c) => c.rewardKind === "practice",
  );
  const practiceBanner =
    showPracticeBanner ?? (hasPracticeReward && rewardsEnabled);

  const slides = (campaigns ?? []).slice(0, 3);

  return (
    <main
      data-testid="benefit-hub"
      data-canon="benefit-hub"
      data-credits-currency="false"
      data-g4-hero-sum="false"
      data-money-pointer={T.benefits.moneyPointer}
      data-engine-pointer={T.benefits.enginePointer}
      data-admin-pointer={T.benefits.adminPointer}
      data-rewards-enabled={rewardsEnabled ? "true" : "false"}
      className={`space-y-6 text-lux-text ${className}`.trim()}
    >
      <header className="space-y-1">
        <h1
          data-canon-block="title"
          className="text-xl font-semibold"
        >
          {T.benefits.title}
        </h1>
        <p className="text-xs text-lux-text-muted">
          {T.benefits.noVirtualCurrencyNote}
        </p>
      </header>

      <section
        data-testid="benefit-hub-hero"
        data-canon-block="hero"
        data-canon-section="hero"
        className="rounded-lux-md border border-lux-border bg-lux-elevated p-4"
        aria-label={T.benefits.title}
      >
        {rewardsEnabled ? (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-lux-text-muted">
                {T.benefits.heroMonthly}
              </p>
              <p
                data-testid="benefit-hero-monthly"
                className="text-2xl font-semibold text-lux-accent"
              >
                {monthLabel}
              </p>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <p>
                <span className="text-lux-text-muted">
                  {T.benefits.heroClaimable}{" "}
                </span>
                <span
                  data-testid="benefit-hero-claimable"
                  className="font-semibold"
                >
                  {claimable}
                </span>
              </p>
              <p>
                <span className="text-lux-text-muted">
                  {T.benefits.heroPending}{" "}
                </span>
                <span
                  data-testid="benefit-hero-pending"
                  className="font-semibold"
                >
                  {pending}
                </span>
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-lux-text-muted">
              {T.benefits.heroEducation}
            </p>
            <p
              data-testid="benefit-hero-education"
              className="text-2xl font-semibold"
            >
              {educationCount}
            </p>
            <p className="text-sm text-lux-text-muted">
              {T.benefits.heroEducationHint}
            </p>
          </div>
        )}
        <p
          data-testid="benefit-kst-countdown"
          className="mt-3 text-xs text-lux-text-muted"
        >
          {T.benefits.dailyReset.replace(
            "{time}",
            formatCountdown(resetMs),
          )}
        </p>
      </section>

      <section
        data-testid="benefit-hub-carousel"
        data-canon-block="campaignCarousel"
        data-canon-section="campaignCarousel"
        aria-label={T.benefits.carouselTitle}
      >
        <h2 className="mb-2 text-sm font-semibold">
          {T.benefits.carouselTitle}
        </h2>
        {slides.length === 0 ? (
          <p
            className="rounded-lux-md border border-dashed border-lux-border px-3 py-4 text-sm text-lux-text-muted"
            role="status"
          >
            {T.benefits.carouselEmpty}
          </p>
        ) : (
          <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
            {slides.map((slide) => (
              <li
                key={slide.id}
                className="w-[min(100%,280px)] shrink-0 snap-start"
              >
                {slide.href ? (
                  <Link
                    href={slide.href}
                    className="block rounded-lux-md border border-lux-border bg-lux-surface p-4"
                  >
                    <p className="text-sm font-semibold">{slide.title}</p>
                    {slide.body ? (
                      <p className="mt-1 text-xs text-lux-text-muted">
                        {slide.body}
                      </p>
                    ) : null}
                  </Link>
                ) : (
                  <div className="rounded-lux-md border border-lux-border bg-lux-surface p-4">
                    <p className="text-sm font-semibold">{slide.title}</p>
                    {slide.body ? (
                      <p className="mt-1 text-xs text-lux-text-muted">
                        {slide.body}
                      </p>
                    ) : null}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {practiceBanner ? <DemoWalletBanner visible /> : null}

      <section
        data-testid="benefit-hub-section-daily"
        data-canon-block="daily"
        data-canon-section="daily"
        aria-label={T.benefits.sectionDaily}
      >
        <h2 className="mb-2 text-sm font-semibold">
          {T.benefits.sectionDaily}
        </h2>
        {renderMissionCards(daily)}
      </section>
      <section
        data-testid="benefit-hub-section-oneTime"
        data-canon-block="oneTime"
        data-canon-section="oneTime"
        aria-label={T.benefits.sectionOneTime}
      >
        <h2 className="mb-2 text-sm font-semibold">
          {T.benefits.sectionOneTime}
        </h2>
        {renderMissionCards(oneTime)}
      </section>
      <section
        data-testid="benefit-hub-section-weekly"
        data-canon-block="weekly"
        data-canon-section="weekly"
        aria-label={T.benefits.sectionWeekly}
      >
        <h2 className="mb-2 text-sm font-semibold">
          {T.benefits.sectionWeekly}
        </h2>
        {renderMissionCards(weekly)}
      </section>
      <section
        data-testid="benefit-hub-section-streak"
        data-canon-block="streak"
        data-canon-section="streak"
        aria-label={T.benefits.sectionStreak}
      >
        <h2 className="mb-2 text-sm font-semibold">
          {T.benefits.sectionStreak}
        </h2>
        {renderMissionCards(streak)}
      </section>

      <footer
        data-testid="benefit-hub-footer"
        data-canon-block="footerLinks"
        data-canon-section="footerLinks"
        className="space-y-2 border-t border-lux-border pt-4 text-sm"
      >
        <p>
          <Link
            href="/me/invite"
            className="text-lux-accent underline-offset-2 hover:underline"
          >
            {T.benefits.footerInvite}
          </Link>
        </p>
        <p>
          <Link
            href="/me/events"
            className="text-lux-accent underline-offset-2 hover:underline"
          >
            {T.benefits.footerEvents}
          </Link>
        </p>
      </footer>
    </main>
  );
}
