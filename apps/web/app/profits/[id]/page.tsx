"use client";

import Link from "next/link";
import { T } from "@aipo/ui/copy/ko";

/**
 * Opportunity detail shell — PART3 owns full card.
 * UI §38.7: Q1 mini + revenue guide link (trust-education).
 */
export default function Page() {
  return (
    <main
      className="space-y-4 p-6 text-lux-text"
      data-testid="opportunity-detail"
    >
      <h1 className="text-xl font-semibold">{T.opportunity.detailTitle}</h1>
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
