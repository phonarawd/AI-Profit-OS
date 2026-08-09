"use client";

import { LegalDoc } from "@aipo/ui/components/legal/LegalDoc";
import { T } from "@aipo/ui/copy/ko";

/** §50.3 A — 이용약관 */
export default function Page() {
  return (
    <LegalDoc
      title={T.legal.termsTitle}
      intro={T.legal.terms.intro}
      sections={T.legal.terms.sections}
    />
  );
}
