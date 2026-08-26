"use client";

import { TrustFAQAccordion } from "@aipo/ui/components/trust";
import { GuidePage } from "../GuidePage";

/** UI §38.7 — /me/guide/faq Objection Q1~Q4 */
export default function Page() {
  return (
    <GuidePage title="자주 묻는 질문" testId="guide-faq">
      <TrustFAQAccordion />
    </GuidePage>
  );
}
