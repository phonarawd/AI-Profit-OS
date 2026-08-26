"use client";

import {
  PlatformRevenueExplainer,
  TaxDisclaimerBlock,
} from "@aipo/ui/components/trust";
import { T } from "@aipo/ui/copy/ko";
import { GuidePage } from "../GuidePage";

/** UI §38.3 — /me/guide/revenue */
export default function Page() {
  return (
    <GuidePage title={T.guide.revenue.title} testId="guide-revenue">
      <p className="sr-only">{T.guide.revenue.title}</p>
      <PlatformRevenueExplainer />
      <TaxDisclaimerBlock />
    </GuidePage>
  );
}
