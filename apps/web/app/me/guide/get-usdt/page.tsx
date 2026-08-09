"use client";

import Link from "next/link";
import { NetworkPlainWarning } from "@aipo/ui/components/wallet/NetworkPlainWarning";
import { T } from "@aipo/ui/copy/ko";

/**
 * UI §38.8 pointer shell · Money §41.6 network warning shared.
 * Long-form guide blocks = UI todo; warning copy Owns=Money.
 */
export default function Page() {
  return (
    <main
      className="p-6 text-lux-text"
      data-testid="guide-get-usdt"
    >
      <h1 className="text-xl font-semibold">{T.wallet.guideGetUsdtTitle}</h1>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link
          href="/wallet/deposit?tab=krw"
          data-testid="guide-cta-krw"
          className="rounded-lux-md border border-lux-border px-3 py-2"
        >
          {T.wallet.guideCtaKrw}
        </Link>
        <Link
          href="/wallet/deposit?tab=usdt"
          data-testid="guide-cta-usdt"
          className="rounded-lux-md border border-lux-border px-3 py-2"
        >
          {T.wallet.guideCtaUsdt}
        </Link>
      </div>
      <p className="mt-4 text-sm text-lux-text-muted">
        {T.wallet.guideNetworkCheck}
      </p>
      <div className="mt-4">
        <NetworkPlainWarning />
      </div>
    </main>
  );
}
