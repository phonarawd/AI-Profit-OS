"use client";

import {
  PlatformRevenueExplainer,
  TaxDisclaimerBlock,
} from "@aipo/ui/components/trust";
import { T } from "@aipo/ui/copy/ko";

/** UI §38.3 — /me/guide/revenue */
export default function Page() {
  return (
    <main className="space-y-6 p-6 text-lux-text" data-testid="guide-revenue">
      <p className="sr-only">{T.guide.revenue.title}</p>
      <PlatformRevenueExplainer />
      <TaxDisclaimerBlock />
    </main>
  );
}
