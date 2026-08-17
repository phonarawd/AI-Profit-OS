import { T } from "../../copy/ko";
import { HomeCleanAiSummary } from "./HomeCleanAiSummary";
import { HomeCleanAsset } from "./HomeCleanAsset";
import { HomeCleanCategoryChips } from "./HomeCleanCategoryChips";
import { HomeCleanDiscovery } from "./HomeCleanDiscovery";
import { createHomeCleanFixtureViewModel } from "./HomeCleanFixture";
import { HomeCleanProducts } from "./HomeCleanProducts";
import { HomeCleanSessionBanner } from "./HomeCleanSessionBanner";
import type { HomeCleanViewModel } from "./home-clean.types";
import styles from "./HomeCleanCards.module.css";

export function HomeCleanView({
  model = createHomeCleanFixtureViewModel(),
  onRetry,
}: {
  model?: HomeCleanViewModel;
  onRetry?: () => void;
}) {
  return (
    <div
      data-hc-view={model.viewState}
      data-hc-session={model.sessionStatus}
      data-hc-mode={model.mode}
    >
      {model.sessionBanner ? (
        <HomeCleanSessionBanner
          kind={model.sessionBanner}
          loginHref={model.cta.login}
        />
      ) : null}
      {model.viewState === "stale" && model.asOfText ? (
        <p className={styles.stateSlot} data-hc-asof="">
          {model.asOfText}
        </p>
      ) : null}
      {model.viewState === "recoverable_error" ? (
        <div className={styles.stateSlot} data-hc-retry="">
          <p>{model.statusText}</p>
          {model.retryAvailable && onRetry ? (
            <button
              type="button"
              className={styles.retryButton}
              onClick={onRetry}
            >
              {T.common.retry}
            </button>
          ) : null}
        </div>
      ) : null}
      {model.viewState === "blocked" ? (
        <p className={styles.stateSlot} data-hc-blocked="">
          {model.statusText}
        </p>
      ) : null}
      <HomeCleanAiSummary
        viewState={model.viewState}
        foundCountText={model.ai.foundCount.text}
        averageReturnText={model.ai.averageReturn.text}
        averageDurationText={model.ai.averageDuration.text}
        mode={model.mode}
      />
      <HomeCleanAsset
        balanceKrwText={model.asset.balanceKrw.text}
        balanceUsdtText={model.asset.balanceUsdt.text}
        mode={model.mode}
        cta={model.cta}
      />
      <HomeCleanCategoryChips mode={model.mode} />
      <HomeCleanDiscovery heroHref={model.cta.hero} mode={model.mode} />
      <HomeCleanProducts items={model.products} mode={model.mode} />
    </div>
  );
}
