"use client";

import Link from "next/link";
import { T } from "../../copy/ko";
import { Badge } from "../../primitives/Badge";
import { TouchButton } from "../../primitives/Button";
import type {
  BenefitCardStatus,
  BenefitMissionCardModel,
  BenefitRewardKind,
} from "./benefit-types";

const ICON_MAP: Record<string, string> = {
  wallet: "💳",
  trade: "📈",
  gift: "🎁",
  streak: "🔥",
  calendar: "📅",
  guide: "📖",
  inbox: "📬",
  star: "⭐",
  default: "🎯",
};

function iconGlyph(icon?: string | null): string {
  if (!icon) return ICON_MAP.default;
  if (/^\p{Extended_Pictographic}/u.test(icon)) return icon;
  return ICON_MAP[icon] ?? ICON_MAP.default;
}

function statusLabel(status: BenefitCardStatus): string {
  switch (status) {
    case "locked":
      return T.benefits.statusLocked;
    case "available":
      return T.benefits.statusStart;
    case "in_progress":
      return T.benefits.statusInProgress;
    case "pending_hold":
    case "posting":
      return T.benefits.statusPending;
    case "released":
      return T.benefits.statusReleased;
    case "queued_pool":
      return T.benefits.statusPoolWait;
    case "expired":
    case "skipped":
      return T.benefits.statusExpired;
    default:
      return T.benefits.statusLocked;
  }
}

function rewardLabel(
  kind: BenefitRewardKind,
  amount: string | null | undefined,
): string | null {
  if (kind === "none") return null;
  const amt = (amount ?? "").trim() || "0";
  const withUsdt = `${amt} ${T.benefits.rewardUsdtSuffix}`;
  if (kind === "practice") {
    return T.benefits.rewardPractice.replace("{amount}", withUsdt);
  }
  if (kind === "promo_profit") {
    return T.benefits.rewardProfit.replace("{amount}", withUsdt);
  }
  if (kind === "fee_coupon") {
    return T.benefits.rewardCoupon.replace("{amount}", withUsdt);
  }
  return null;
}

function rewardBadgeTone(
  kind: BenefitRewardKind,
): "accent" | "principal" | "muted" | "warning" {
  if (kind === "practice") return "muted";
  if (kind === "promo_profit") return "accent";
  if (kind === "fee_coupon") return "warning";
  return "muted";
}

function rewardBadgeText(kind: BenefitRewardKind): string | null {
  if (kind === "practice") return T.benefits.practiceBadge;
  if (kind === "promo_profit") return T.benefits.profitBadge;
  if (kind === "fee_coupon") return T.benefits.couponBadge;
  return null;
}

export type BenefitMissionCardProps = {
  card: BenefitMissionCardModel;
  className?: string;
};

/**
 * Canon benefit-mission-card — icon·title·body·reward·status·progress·cta
 * autoClaim → 「받기」버튼 0 · Credits 화폐 0
 */
export function BenefitMissionCard({
  card,
  className = "",
}: BenefitMissionCardProps) {
  const label = statusLabel(card.status);
  const reward = rewardLabel(card.rewardKind, card.rewardAmountUsdt);
  const badge = rewardBadgeText(card.rewardKind);
  const deep = (card.deepRoute ?? "").trim();
  const showProgress =
    card.section === "weekly" &&
    card.progress &&
    card.progress.target > 0;
  const pct = showProgress
    ? Math.min(
        100,
        Math.round(
          (card.progress!.current / card.progress!.target) * 100,
        ),
      )
    : 0;

  const ctaStart =
    card.status === "available" && deep.length > 0;
  const ctaContinue =
    card.status === "in_progress" && deep.length > 0;
  const ctaPool = card.status === "queued_pool";
  const ctaDisabled =
    card.status === "locked" ||
    card.status === "expired" ||
    card.status === "skipped";

  return (
    <article
      data-testid="benefit-mission-card"
      data-canon="benefit-mission-card"
      data-mission-id={card.missionId}
      data-status={card.status}
      data-reward-kind={card.rewardKind}
      data-credits-currency="false"
      data-auto-claim={card.autoClaim === false ? "false" : "true"}
      className={`rounded-pd-md border border-pd-border bg-pd-surface p-4 ${className}`.trim()}
    >
      <div className="flex items-start gap-3">
        <span
          data-canon-slot="icon"
          className="text-2xl leading-none"
          aria-hidden
        >
          {iconGlyph(card.icon)}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              data-canon-slot="title"
              className="text-sm font-semibold text-pd-text"
            >
              {card.titleKo}
            </h3>
            {badge ? (
              <Badge tone={rewardBadgeTone(card.rewardKind)}>
                {card.rewardKind === "promo_profit" ? `⚡ ${badge}` : badge}
              </Badge>
            ) : null}
          </div>
          <p
            data-canon-slot="body"
            className="text-sm text-pd-text-muted"
          >
            {card.bodyKo}
          </p>
          {reward ? (
            <p
              data-canon-slot="rewardAmount"
              className="text-sm font-medium text-pd-accent"
            >
              {reward}
            </p>
          ) : null}
          <p
            data-canon-slot="statusLabel"
            className="text-xs text-pd-text-muted"
            role="status"
          >
            {label}
            {card.status === "released" ? " ✓" : ""}
          </p>
          {showProgress ? (
            <div
              data-canon-slot="progressBar"
              className="mt-2"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              role="progressbar"
            >
              <div className="h-1.5 overflow-hidden rounded-full bg-pd-elevated">
                <div
                  className="h-full rounded-full bg-pd-accent"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-pd-text-muted">
                {card.progress!.current}/{card.progress!.target}
              </p>
            </div>
          ) : null}
          <div data-canon-slot="cta" className="pt-2">
            {ctaStart ? (
              <Link href={deep} className="inline-block">
                <TouchButton variant="primary">
                  {T.benefits.statusStart}
                </TouchButton>
              </Link>
            ) : null}
            {ctaContinue ? (
              <Link href={deep} className="inline-block">
                <TouchButton variant="secondary">
                  {T.benefits.statusContinue}
                </TouchButton>
              </Link>
            ) : null}
            {ctaPool ? (
              <div className="space-y-1">
                <p className="text-xs text-pd-text-muted">
                  {T.benefits.poolWaitNote}
                </p>
                <Link href="/me/guide/faq" className="inline-block">
                  <TouchButton variant="ghost">
                    {T.benefits.poolFaqCta}
                  </TouchButton>
                </Link>
              </div>
            ) : null}
            {ctaDisabled ? (
              <TouchButton variant="ghost" disabled>
                {label}
              </TouchButton>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
