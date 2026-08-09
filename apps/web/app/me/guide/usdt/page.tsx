"use client";

import Link from "next/link";
import {
  TaxDisclaimerBlock,
  UsdtVsKrwCompareTable,
  WhyUsdtCard,
} from "@aipo/ui/components/trust";
import { T } from "@aipo/ui/copy/ko";

/** UI §38.2 — /me/guide/usdt */
export default function Page() {
  return (
    <main className="space-y-6 p-6 text-lux-text" data-testid="guide-usdt">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">{T.guide.usdt.title}</h1>
        <p className="text-sm text-lux-text-muted">{T.guide.usdt.lead}</p>
      </header>
      <WhyUsdtCard showSeniorAnalogy />
      <UsdtVsKrwCompareTable />
      <TaxDisclaimerBlock />
      <Link
        href="/me/guide/get-usdt"
        className="inline-block text-sm text-lux-accent underline"
        data-testid="guide-usdt-to-get"
      >
        {T.guide.getUsdt.title}
      </Link>
    </main>
  );
}
