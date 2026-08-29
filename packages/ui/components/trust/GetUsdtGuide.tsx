"use client";

import Link from "next/link";
import { T } from "../../copy/ko";
import { NetworkPlainWarning } from "../wallet/NetworkPlainWarning";
import { TaxDisclaimerBlock } from "./TaxDisclaimerBlock";
import { WhyUsdtCard } from "./WhyUsdtCard";

export type GetUsdtGuideProps = {
  className?: string;
};

/**
 * UI §38.8 — /me/guide/get-usdt block order lock.
 * Chain-code jargon forbidden on this surface (plain-ko network name only).
 */
export function GetUsdtGuide({ className = "" }: GetUsdtGuideProps) {
  const g = T.guide.getUsdt;
  return (
    <main
      data-testid="guide-get-usdt"
      data-canon="get-usdt-guide"
      className={`space-y-6 text-pd-text ${className}`.trim()}
    >
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">{g.title}</h1>
        <p className="text-sm text-pd-text-muted">{g.lead}</p>
      </header>

      {/* 1. Choose first */}
      <section data-testid="get-usdt-choose" className="space-y-2">
        <h2 className="text-sm font-medium">{g.chooseFirst}</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href="/wallet/deposit?tab=krw"
            data-testid="guide-cta-krw"
            className="touch-target rounded-pd-md border border-pd-border px-3 py-2"
          >
            {T.wallet.guideCtaKrw}
          </Link>
          <Link
            href="/wallet/deposit?tab=usdt"
            data-testid="guide-cta-usdt"
            className="touch-target rounded-pd-md border border-pd-accent bg-pd-elevated px-3 py-2 text-pd-accent"
          >
            {T.wallet.guideCtaUsdt}
          </Link>
        </div>
      </section>

      {/* 2. What is USDT + Why link */}
      <section data-testid="get-usdt-what" className="space-y-2">
        <h2 className="text-sm font-medium">{g.whatIsUsdt}</h2>
        <p className="text-sm text-pd-text-muted">{g.whatIsUsdtBody}</p>
        <WhyUsdtCard />
        <Link
          href="/me/guide/usdt"
          className="inline-block text-sm text-pd-accent underline"
          data-testid="get-usdt-why-link"
        >
          {g.whyLink}
        </Link>
      </section>

      {/* 3. Prepare */}
      <section data-testid="get-usdt-prepare" className="space-y-2">
        <h2 className="text-sm font-medium">{g.prepareTitle}</h2>
        <p className="text-sm text-pd-text-muted">{g.prepareBody}</p>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-pd-text-muted">
          <li>{g.step1}</li>
          <li>{g.step2}</li>
          <li>{g.step3}</li>
        </ol>
      </section>

      {/* 4. Network warning (same as deposit) */}
      <section data-testid="get-usdt-send" className="space-y-2">
        <h2 className="text-sm font-medium">{g.sendTitle}</h2>
        <NetworkPlainWarning />
      </section>

      {/* 5. Wrong sent → support */}
      <section
        data-testid="get-usdt-wrong"
        className="rounded-pd-md border border-pd-border p-3"
      >
        <h2 className="text-sm font-medium">{g.wrongChain}</h2>
        <p className="mt-1 text-sm text-pd-text-muted">{g.wrongChainBody}</p>
        <Link
          href="/me/support?category=deposit&kind=wrong_chain"
          data-testid="get-usdt-support-link"
          className="mt-2 inline-block text-sm text-pd-accent underline"
        >
          {g.supportLink}
        </Link>
      </section>

      {/* 6. Tax disclaimer */}
      <TaxDisclaimerBlock />
    </main>
  );
}
