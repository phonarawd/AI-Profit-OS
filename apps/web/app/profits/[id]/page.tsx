"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchOpportunityDetail } from "@aipo/sdk/user-feed";
import { OpportunityDetail } from "@aipo/ui/components/opportunity";
import type { OpportunityCardModel } from "@aipo/ui/components/opportunity";
import { T } from "@aipo/ui/copy/ko";
import { toOpportunityCardModel } from "../../../lib/opportunity-card-map";

/**
 * PART9e — Opportunity detail live GET /api/v1/opportunities/:id
 * CTA=`이 기회로 수익 벌기` · arbitrageTypeKo Engine pass-through
 */
export default function Page() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";

  const [opportunity, setOpportunity] = useState<OpportunityCardModel | null>(
    null,
  );
  const [sessionExpired, setSessionExpired] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      return;
    }
    const ac = new AbortController();
    let cancelled = false;

    async function load() {
      try {
        const res = await fetchOpportunityDetail(id, { signal: ac.signal });
        if (cancelled) return;
        const card = toOpportunityCardModel(res.item);
        if (!card) {
          setNotFound(true);
          setOpportunity(null);
          return;
        }
        setOpportunity(card);
        setNotFound(false);
        setSessionExpired(false);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "";
        if (
          msg.includes("opportunity_detail_401") ||
          /unauthorized/i.test(msg)
        ) {
          setSessionExpired(true);
          setOpportunity(null);
          return;
        }
        if (msg.includes("opportunity_detail_404")) {
          setNotFound(true);
          setOpportunity(null);
          return;
        }
        setNotFound(true);
        setOpportunity(null);
      }
    }

    void load();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [id]);

  return (
    <main
      className="space-y-4 p-6 pb-28 text-lux-text"
      data-testid="opportunity-detail"
    >
      {sessionExpired ? (
        <p className="text-sm text-lux-text-muted" role="status">
          <Link href="/auth/login" className="text-lux-accent underline">
            {T.toast.SESSION_EXPIRED}
          </Link>
        </p>
      ) : null}
      {notFound && !sessionExpired ? (
        <p className="text-sm text-lux-text-muted" role="status">
          {T.user.empty.opportunities}
        </p>
      ) : null}
      {opportunity ? (
        <OpportunityDetail
          opportunity={opportunity}
          onEarn={(oppId) => {
            window.location.href = `/trades/${oppId}/execute`;
          }}
        />
      ) : null}
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
