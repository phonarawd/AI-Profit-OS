"use client";

import { MarketPartnerGrid } from "@aipo/ui/components/trust/MarketPartnerGrid";
import { T } from "@aipo/ui/copy/ko";

/**
 * UI §38.10 — 공식 협력사 guide.
 * Logo SVGs = blocking sub-deliverable (status=blocked until Brand Kit ready).
 */
export default function Page() {
  return (
    <main className="p-6 text-lux-text">
      <MarketPartnerGrid />
      <p className="mt-6 text-xs text-lux-text-muted">
        {T.trust.partners.legFootnote}
      </p>
    </main>
  );
}
