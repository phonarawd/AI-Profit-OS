"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CategoryFilterChips,
  OpportunityCard,
  type CategoryFilterKey,
  type OpportunityCardModel,
} from "@aipo/ui/components/opportunity";
import { T } from "@aipo/ui/copy/ko";

/** PART3 /profits — §5.3b 카드 위계 · 필터 가방 포함 */
export default function Page() {
  const [category, setCategory] = useState<CategoryFilterKey>("all");
  const items: OpportunityCardModel[] = [];

  const filtered =
    category === "all"
      ? items
      : items.filter((i) => i.category === category);

  return (
    <main className="space-y-4 p-6 text-lux-text" data-testid="profits-shell">
      <h1 className="text-xl font-semibold">{T.user.profits.title}</h1>
      <p className="text-sm text-lux-text-muted">{T.user.profits.subtitle}</p>

      <CategoryFilterChips value={category} onChange={setCategory} />

      <ul className="space-y-3" data-testid="opportunity-list">
        {filtered.map((o) => (
          <li key={o.id}>
            <OpportunityCard opportunity={o} />
          </li>
        ))}
      </ul>

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
