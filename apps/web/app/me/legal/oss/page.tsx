"use client";

import { LegalDoc } from "@aipo/ui/components/legal/LegalDoc";
import { T } from "@aipo/ui/copy/ko";

/** §50.3 C — 오픈소스 고지 */
export default function Page() {
  return (
    <LegalDoc
      title={T.legal.ossTitle}
      intro={T.legal.oss.intro}
      sections={[{ title: T.legal.ossTitle, body: T.legal.oss.body }]}
      showTax={false}
    />
  );
}
