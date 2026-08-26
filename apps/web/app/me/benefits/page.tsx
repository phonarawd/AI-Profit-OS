"use client";

import { useEffect, useState } from "react";
import {
  BenefitHub,
  type BenefitCampaignSlide,
  type BenefitHubProps,
  type BenefitMissionCardModel,
  type BenefitSummaryModel,
} from "@aipo/ui/components/benefits";
import {
  PremiumEmptyState,
  PremiumSurface,
} from "../../../components/putduk-premium";
import {
  AccountAuthActions,
  AccountFrame,
  type AccountView,
} from "../AccountFrame";
import styles from "../account.module.css";

type BenefitsListResponse = {
  sections?: {
    daily?: BenefitMissionCardModel[];
    oneTime?: BenefitMissionCardModel[];
    weekly?: BenefitMissionCardModel[];
    streak?: BenefitMissionCardModel[];
  };
  items?: BenefitMissionCardModel[];
};

type BenefitsSummaryResponse = BenefitSummaryModel;

const TITLE = "\uD61C\uD0DD";
const LOADING = "\uBD88\uB7EC\uC624\uB294 \uC911\u2026";
const LOGIN_LINE = "\uB85C\uADF8\uC778\uD558\uBA74 \uD61C\uD0DD\uC744 \uBCFC \uC218 \uC788\uC5B4\uC694.";
const LOGIN_TITLE = "\uB85C\uADF8\uC778\uD558\uBA74 \uD61C\uD0DD\uC744 \uBCFC \uC218 \uC788\uC5B4\uC694";
const UNAVAILABLE = "\uD61C\uD0DD\uC744 \uD655\uC778\uD560 \uC218 \uC5C6\uC74C";
const UNAVAILABLE_TITLE = "\uC9C0\uAE08\uC740 \uD655\uC778\uD560 \uC218 \uC5C6\uC5B4\uC694";

export default function Page() {
  const [view, setView] = useState<AccountView>("loading");
  const [summary, setSummary] = useState<BenefitSummaryModel | null>(null);
  const [sections, setSections] = useState<BenefitHubProps["sections"]>(null);
  const [campaigns, setCampaigns] = useState<BenefitCampaignSlide[] | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      try {
        const [listRes, sumRes] = await Promise.all([
          fetch("/api/v1/me/benefits", {
            credentials: "include",
            headers: { Accept: "application/json" },
            signal: ac.signal,
          }),
          fetch("/api/v1/me/benefits/summary", {
            credentials: "include",
            headers: { Accept: "application/json" },
            signal: ac.signal,
          }),
        ]);
        if (ac.signal.aborted) return;
        if (listRes.status === 401 || sumRes.status === 401) {
          setView("unauthorized");
          return;
        }
        if (!listRes.ok || !sumRes.ok) {
          setView("unavailable");
          return;
        }
        const list = (await listRes.json()) as BenefitsListResponse;
        const sum = (await sumRes.json()) as BenefitsSummaryResponse;
        if (ac.signal.aborted) return;
        setSections({
          daily: list.sections?.daily ?? [],
          oneTime: list.sections?.oneTime ?? [],
          weekly: list.sections?.weekly ?? [],
          streak: list.sections?.streak ?? [],
        });
        const inline = (list.items ?? []).filter(
          (i) => i.sectionRaw === "campaign_inline",
        );
        setCampaigns(
          inline.slice(0, 3).map((c) => ({
            id: c.missionId,
            title: c.titleKo,
            body: c.bodyKo,
            href: c.deepRoute ?? "/me/events",
          })),
        );
        setSummary({
          claimableCount: sum.claimableCount,
          pendingHoldCount: sum.pendingHoldCount,
          queuedPoolCount: sum.queuedPoolCount,
          releasedCount: sum.releasedCount,
          releasedMonthUsdt: sum.releasedMonthUsdt,
          releasedMonthKrwApprox: sum.releasedMonthKrwApprox ?? null,
          rewardsEnabled: sum.rewardsEnabled === true,
          accrualHalted: sum.accrualHalted === true,
          creditsCurrency: false,
        });
        setView("ready");
      } catch (err) {
        if (ac.signal.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setView("unavailable");
      }
    })();
    return () => ac.abort();
  }, []);

  if (view === "loading") {
    return (
      <AccountFrame title={TITLE} view="loading" testId="benefits-page">
        <p className={styles.lead}>{LOADING}</p>
      </AccountFrame>
    );
  }
  if (view === "unauthorized") {
    return (
      <AccountFrame title={TITLE} view="unauthorized" testId="benefits-page">
        <PremiumSurface>
          <PremiumEmptyState
            title={LOGIN_TITLE}
            description={LOGIN_LINE}
            action={<AccountAuthActions />}
          />
        </PremiumSurface>
      </AccountFrame>
    );
  }
  if (view === "unavailable") {
    return (
      <AccountFrame title={TITLE} view="unavailable" testId="benefits-page">
        <PremiumSurface>
          <PremiumEmptyState title={UNAVAILABLE_TITLE} description={UNAVAILABLE} />
        </PremiumSurface>
      </AccountFrame>
    );
  }

  return (
    <AccountFrame title={TITLE} view="ready" testId="benefits-page" hideTitle>
      <PremiumSurface className={styles.surface}>
        <BenefitHub summary={summary} sections={sections} campaigns={campaigns} />
      </PremiumSurface>
    </AccountFrame>
  );
}
