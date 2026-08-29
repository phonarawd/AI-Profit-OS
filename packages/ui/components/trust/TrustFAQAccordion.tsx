"use client";

import { T } from "../../copy/ko";
import { CapitalVsWageCompare } from "./CapitalVsWageCompare";
import { ObjectionFourAccordion } from "./ObjectionFourAccordion";
import { TaxDisclaimerBlock } from "./TaxDisclaimerBlock";

export type TrustFAQAccordionProps = {
  className?: string;
};

/** UI §38.4 / §38.7 — /me/guide/faq surface */
export function TrustFAQAccordion({ className = "" }: TrustFAQAccordionProps) {
  return (
    <section
      data-testid="trust-faq"
      className={`space-y-6 ${className}`.trim()}
    >
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-pd-text">
          {T.trust.faq.title}
        </h1>
        <p className="text-sm text-pd-text-muted">{T.trust.faq.lead}</p>
      </header>
      <ObjectionFourAccordion defaultOpen="q1" />
      <CapitalVsWageCompare />
      <TaxDisclaimerBlock />
    </section>
  );
}
