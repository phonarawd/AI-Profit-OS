"use client";

import Link from "next/link";
import {
  TaxDisclaimerBlock,
  UsdtVsKrwCompareTable,
  WhyUsdtCard,
} from "@aipo/ui/components/trust";
import { T } from "@aipo/ui/copy/ko";
import { AccountFrame } from "../../AccountFrame";
import styles from "../../account.module.css";

/** UI §38.2 — /me/guide/usdt */
export default function Page() {
  return (
    <AccountFrame title={T.guide.usdt.title} view="ready" testId="guide-usdt" hideTitle>
    <main className={`${styles.surface} space-y-6`}>
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">{T.guide.usdt.title}</h1>
        <p className="text-sm text-pd-text-muted">{T.guide.usdt.lead}</p>
      </header>
      <WhyUsdtCard showSeniorAnalogy />
      <UsdtVsKrwCompareTable />
      <TaxDisclaimerBlock />
      <Link
        href="/me/guide/get-usdt"
        className="inline-block text-sm text-pd-accent underline"
        data-testid="guide-usdt-to-get"
      >
        {T.guide.getUsdt.title}
      </Link>
    </main>
    </AccountFrame>
  );
}
