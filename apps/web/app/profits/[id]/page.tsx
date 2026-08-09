"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { OpportunityDetail } from "@aipo/ui/components/opportunity";
import type { OpportunityCardModel } from "@aipo/ui/components/opportunity";
import { T } from "@aipo/ui/copy/ko";

/**
 * Opportunity detail — PART3b CTA=`이 기회로 수익 벌기`
 * Live card = GET /api/v1/opportunities/:id (arbitrageTypeKo Engine pass-through)
 * UI §38.7: Q1 mini + revenue guide link
 */
export default function Page() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "preview";

  /**
   * Session feed 미배선 시 placeholder — type→ko 맵/하드코딩 금지
   * arbitrageTypeKo 는 빈 문자열(엔진 투영 전) · 라벨만 슬롯 유지
   */
  const opportunity: OpportunityCardModel = {
    id,
    arbitrageTypeKo: "",
    assetLabel: T.opportunity.detailTitle,
    assetImageUrl: "",
    assetImageAltKo: T.opportunity.detailTitle,
    assetImageSource: null,
    category: "watch",
    requiredCapitalUsdt: "0",
    expectedProfitUsdt: "0",
    aiConfidenceScore: 0,
    compareReady: false,
    bucket: "affordable",
  };

  return (
    <main
      className="space-y-4 p-6 pb-28 text-lux-text"
      data-testid="opportunity-detail"
    >
      <OpportunityDetail
        opportunity={opportunity}
        onEarn={(oppId) => {
          window.location.href = `/trades/${oppId}/execute`;
        }}
      />
      <aside
        data-testid="objection-q1-mini"
        className="rounded-lux-md border border-lux-border bg-lux-elevated p-3 text-sm"
      >
        <p className="font-medium">{T.objections.q1.q}</p>
        <p className="mt-1 text-lux-text-muted">{T.objections.detailMini}</p>
        <p className="mt-2 text-lux-text-muted">{T.objections.q1.oneLiner}</p>
        <Link
          href="/me/guide/revenue"
          className="mt-2 inline-block text-lux-accent underline"
          data-testid="objection-revenue-link"
        >
          {T.objections.detailLink}
        </Link>
      </aside>
    </main>
  );
}
