"use client";

import { useEffect, useState } from "react";
import {
  BenefitHub,
  type BenefitCampaignSlide,
  type BenefitHubProps,
  type BenefitMissionCardModel,
  type BenefitSummaryModel,
} from "@aipo/ui/components/benefits";

type BenefitsListResponse = {
  rewardsEnabled?: boolean;
  accrualHalted?: boolean;
  sections?: {
    daily?: BenefitMissionCardModel[];
    oneTime?: BenefitMissionCardModel[];
    weekly?: BenefitMissionCardModel[];
    streak?: BenefitMissionCardModel[];
  };
  items?: BenefitMissionCardModel[];
};

type BenefitsSummaryResponse = BenefitSummaryModel & {
  benefitsHref?: string;
};

/**
 * /me/benefits — Canon benefit-hub · UI §5.9.5 PART7b
 * Accrual/ledger Owns=Money §51.8a · fanout Owns=Engine §48.13.4
 * Admin catalog pointer=growth?tab=missions
 */
export default function Page() {
  const [summary, setSummary] = useState<BenefitSummaryModel | null>(null);
  const [sections, setSections] = useState<
    BenefitHubProps["sections"]
  >(null);
  const [campaigns, setCampaigns] = useState<BenefitCampaignSlide[] | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [listRes, sumRes] = await Promise.all([
          fetch("/api/v1/me/benefits", {
            credentials: "include",
            headers: { Accept: "application/json" },
          }),
          fetch("/api/v1/me/benefits/summary", {
            credentials: "include",
            headers: { Accept: "application/json" },
          }),
        ]);

        if (cancelled) return;

        if (listRes.ok) {
          const list = (await listRes.json()) as BenefitsListResponse;
          setSections({
            daily: list.sections?.daily ?? [],
            oneTime: list.sections?.oneTime ?? [],
            weekly: list.sections?.weekly ?? [],
            streak: list.sections?.streak ?? [],
          });
          /* campaign_inline / §51.5b mirror — 응답에 없으면 빈 캐러셀 */
          const inline = (list.items ?? []).filter(
            (i) => i.sectionRaw === "campaign_inline",
          );
          if (inline.length) {
            setCampaigns(
              inline.slice(0, 3).map((c) => ({
                id: c.missionId,
                title: c.titleKo,
                body: c.bodyKo,
                href: c.deepRoute ?? "/me/events",
              })),
            );
          } else {
            setCampaigns([]);
          }
        } else {
          setSections({
            daily: [],
            oneTime: [],
            weekly: [],
            streak: [],
          });
          setCampaigns([]);
        }

        if (sumRes.ok) {
          const sum = (await sumRes.json()) as BenefitsSummaryResponse;
          setSummary({
            claimableCount: sum.claimableCount ?? 0,
            pendingHoldCount: sum.pendingHoldCount ?? 0,
            queuedPoolCount: sum.queuedPoolCount,
            releasedCount: sum.releasedCount,
            releasedMonthUsdt: sum.releasedMonthUsdt ?? "0",
            releasedMonthKrwApprox: sum.releasedMonthKrwApprox ?? null,
            rewardsEnabled: sum.rewardsEnabled === true,
            accrualHalted: sum.accrualHalted === true,
            creditsCurrency: false,
          });
        } else {
          setSummary({
            claimableCount: 0,
            pendingHoldCount: 0,
            releasedMonthUsdt: "0",
            rewardsEnabled: false,
            creditsCurrency: false,
          });
        }
      } catch {
        if (cancelled) return;
        setSections({
          daily: [],
          oneTime: [],
          weekly: [],
          streak: [],
        });
        setCampaigns([]);
        setSummary({
          claimableCount: 0,
          pendingHoldCount: 0,
          releasedMonthUsdt: "0",
          rewardsEnabled: false,
          creditsCurrency: false,
        });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-6">
      <BenefitHub
        summary={summary}
        sections={sections}
        campaigns={campaigns}
      />
    </div>
  );
}
