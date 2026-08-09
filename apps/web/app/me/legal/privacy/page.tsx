"use client";

import { LegalDoc } from "@aipo/ui/components/legal/LegalDoc";
import { T } from "@aipo/ui/copy/ko";

/** §50.3 B — 개인정보 처리방침 */
export default function Page() {
  return (
    <LegalDoc
      title={T.legal.privacyTitle}
      intro={T.legal.privacy.intro}
      sections={T.legal.privacy.blocks}
    />
  );
}
