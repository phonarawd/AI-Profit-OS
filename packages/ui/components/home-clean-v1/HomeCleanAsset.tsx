import Link from "next/link";
import { T } from "../../copy/ko";
import { HOME_CLEAN_COPY } from "./home-clean-copy";
import {
  HOME_CLEAN_ACTUAL_PROFIT_BINDING,
} from "./HomeCleanFixture";
import { HOME_CLEAN_CTA_HREF } from "./home-clean.types";
import type { HomeCleanCtaHref, HomeCleanDataMode } from "./home-clean.types";
import { HomeCleanTrendLine } from "./home-clean-ui-icons";
import styles from "./HomeCleanCards.module.css";
import responsive from "./HomeCleanResponsive.module.css";

export function HomeCleanAsset({
  balanceKrwText,
  balanceUsdtText,
  mode,
  cta = HOME_CLEAN_CTA_HREF,
}: {
  balanceKrwText: string;
  balanceUsdtText: string;
  mode: HomeCleanDataMode;
  cta?: HomeCleanCtaHref;
}) {
  return (
    <section
      className={`${styles.assetWrap} ${responsive.assetWrap}`}
      aria-label={HOME_CLEAN_COPY.asset.aria}
      data-hc-mode={mode}
      data-hc-actual-profit={HOME_CLEAN_ACTUAL_PROFIT_BINDING}
    >
      <div className={`${styles.assetCard} ${responsive.assetCard}`}>
        <div className={`${styles.assetHead} ${responsive.assetHead}`}>
          <h2 className={styles.assetTitle}>
            {HOME_CLEAN_COPY.asset.sectionHeading}
          </h2>
          <div
            className={styles.assetUnits}
            aria-label={HOME_CLEAN_COPY.asset.unitAria}
          >
            <span className={styles.assetUnitPrimary}>
              {HOME_CLEAN_COPY.asset.krwUnit}
            </span>
            <span className={styles.assetUnitSecondary}>
              {HOME_CLEAN_COPY.asset.usdtUnit}
            </span>
          </div>
        </div>
        <div className={styles.assetBalanceBlock}>
          <p className={styles.assetBalanceLabel}>
            {HOME_CLEAN_COPY.asset.balanceField}
          </p>
          <p
            className={`${styles.assetBalancePrimary} ${responsive.assetBalancePrimary}`}
          >
            {balanceKrwText}
          </p>
          <p
            className={`${styles.assetBalanceSecondary} ${responsive.assetBalanceSecondary}`}
          >
            {HOME_CLEAN_COPY.asset.usdtUnit} {balanceUsdtText}
          </p>
        </div>
        <div className={`${styles.assetActions} ${responsive.assetActions}`}>
          <Link
            className={`${styles.assetActionPrimary} ${responsive.assetAction}`}
            href={cta.deposit}
          >
            {T.feed.ctaDeposit}
          </Link>
          <Link
            className={`${styles.assetAction} ${responsive.assetAction}`}
            href={cta.withdraw}
          >
            {T.feed.ctaWithdraw}
          </Link>
          <Link
            className={`${styles.assetAction} ${responsive.assetAction}`}
            href={cta.history}
          >
            {HOME_CLEAN_COPY.asset.historyCta}
          </Link>
        </div>
        <div
          className={`${styles.assetTrend} ${responsive.assetTrend}`}
          aria-label={HOME_CLEAN_COPY.asset.trendAria}
        >
          <HomeCleanTrendLine />
        </div>
      </div>
    </section>
  );
}
