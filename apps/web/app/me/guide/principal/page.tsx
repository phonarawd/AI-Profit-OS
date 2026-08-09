"use client";

import Link from "next/link";
import { T } from "@aipo/ui/copy/ko";

/** Money §49.4 guide — 왜 원금을 두나요? */
export default function Page() {
  return (
    <main className="p-6 text-lux-text">
      <h1 className="text-xl font-semibold">{T.principalGuide.pageTitle}</h1>
      <p className="mt-3 text-sm text-lux-text-muted">
        {T.principalGuide.whyKeep}
      </p>
      <p className="mt-3 text-sm text-lux-text">
        {T.principalGuide.alwaysWithdraw}
      </p>
      <p className="mt-3 text-sm text-lux-text-muted">
        {T.principalGuide.mergeHint}
      </p>
      <Link
        href="/wallet/withdraw?mode=principal"
        data-principal-reachable="true"
        className="mt-6 inline-block text-sm text-lux-accent underline"
      >
        {T.withdrawMode.ctaOpenPrincipal}
      </Link>
    </main>
  );
}
