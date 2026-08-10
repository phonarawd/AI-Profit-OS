"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchOpportunityFeed } from "@aipo/sdk/user-feed";
import {
  CategoryFilterChips,
  VirtualOpportunityList,
  type CategoryFilterKey,
  type OpportunityCardModel,
} from "@aipo/ui/components/opportunity";
import { T } from "@aipo/ui/copy/ko";
import { toOpportunityCardModel } from "../../lib/opportunity-card-map";

/**
 * PART9e /profits — live feed · §5.3b 카드 위계 · VirtualOpportunityList
 */
export default function Page() {
  const [category, setCategory] = useState<CategoryFilterKey>("all");
  const [items, setItems] = useState<OpportunityCardModel[]>([]);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;

    async function load() {
      try {
        const feed = await fetchOpportunityFeed({ signal: ac.signal });
        if (cancelled) return;
        setItems(
          feed.items
            .map(toOpportunityCardModel)
            .filter((x): x is OpportunityCardModel => x != null),
        );
        setSessionExpired(false);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("opportunity_feed_401") || /unauthorized/i.test(msg)) {
          setSessionExpired(true);
        }
        setItems([]);
      }
    }

    void load();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, []);

  const filtered =
    category === "all"
      ? items
      : items.filter((i) => i.category === category);

  return (
    <main className="space-y-4 p-6 text-lux-text" data-testid="profits-shell">
      <h1 className="text-xl font-semibold">{T.user.profits.title}</h1>
      <p className="text-sm text-lux-text-muted">{T.user.profits.subtitle}</p>

      {sessionExpired ? (
        <p className="text-sm text-lux-text-muted" role="status">
          <Link href="/auth/login" className="text-lux-accent underline">
            {T.toast.SESSION_EXPIRED}
          </Link>
        </p>
      ) : null}

      <CategoryFilterChips value={category} onChange={setCategory} />

      <VirtualOpportunityList items={filtered} />

      {filtered.length === 0 ? (
        <>
          <p className="mt-2 text-sm" role="status">
            {T.user.empty.opportunities}
          </p>
          <Link
            href="/wallet/deposit"
            className="mt-4 inline-block text-sm text-lux-accent underline"
          >
            {T.user.empty.opportunitiesCta}
          </Link>
        </>
      ) : null}
    </main>
  );
}
