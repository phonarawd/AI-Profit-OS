"use client";

import Link from "next/link";
import {
  TaxDisclaimerBlock,
  UsdtVsKrwCompareTable,
  WhyUsdtCard,
} from "@aipo/ui/components/trust";
import { T } from "@aipo/ui/copy/ko";
import { GuidePage } from "../GuidePage";
import styles from "../guide.module.css";

/** UI §38.2 — /me/guide/usdt */
export default function Page() {
  return (
    <GuidePage title={T.guide.usdt.title} testId="guide-usdt">
      <header className={styles.header}>
        <h1 className="pt-premium-title">{T.guide.usdt.title}</h1>
        <p className="pt-premium-description">{T.guide.usdt.lead}</p>
      </header>
      <WhyUsdtCard showSeniorAnalogy />
      <UsdtVsKrwCompareTable />
      <TaxDisclaimerBlock />
      <Link
        href="/me/guide/get-usdt"
        className={`${styles.cta} pt-premium-focus`}
        data-testid="guide-usdt-to-get"
      >
        {T.guide.getUsdt.title}
      </Link>
    </GuidePage>
  );
}
