import { T } from "../../copy/ko";
import { HOME_CLEAN_COPY } from "./home-clean-copy";
import { HOME_CLEAN_DATA_MODE } from "./HomeCleanFixture";
import type { HomeCleanDataMode } from "./home-clean.types";
import {
  HomeCleanRailInsightIcon,
  HomeCleanRailProgressIcon,
  HomeCleanRailTrustIcon,
  HomeCleanRailUpdateIcon,
} from "./home-clean-ui-icons";
import styles from "./HomeCleanCards.module.css";
import responsive from "./HomeCleanResponsive.module.css";

export function HomeCleanRightRail({
  mode = HOME_CLEAN_DATA_MODE,
}: {
  mode?: HomeCleanDataMode;
}) {
  return (
    <div
      className={`${styles.railStack} ${responsive.railStack}`}
      data-hc-mode={mode}
    >
      <section
        className={`${styles.railCard} ${responsive.railCard}`}
        data-hc-rail="progress"
      >
        <div className={styles.railHead}>
          <span className={styles.railIcon}>
            <HomeCleanRailProgressIcon />
          </span>
          <h2 className={styles.railTitle}>{HOME_CLEAN_COPY.rail.progress}</h2>
        </div>
        <p className={styles.railBody}>{T.home.rightRail.progressEmpty}</p>
      </section>
      <section
        className={`${styles.railCard} ${responsive.railCard}`}
        data-hc-rail="update"
      >
        <div className={styles.railHead}>
          <span className={styles.railIcon}>
            <HomeCleanRailUpdateIcon />
          </span>
          <h2 className={styles.railTitle}>{HOME_CLEAN_COPY.rail.update}</h2>
        </div>
        <p className={styles.railBody}>{T.home.update.nextBody}</p>
      </section>
      <section
        className={`${styles.railCard} ${responsive.railCard}`}
        data-hc-rail="trust"
      >
        <div className={styles.railHead}>
          <span className={styles.railIcon}>
            <HomeCleanRailTrustIcon />
          </span>
          <h2 className={styles.railTitle}>{HOME_CLEAN_COPY.rail.trust}</h2>
        </div>
        <p className={styles.railBody}>{T.home.trustList.principal}</p>
      </section>
      <section
        className={`${styles.railCard} ${responsive.railCard}`}
        data-hc-rail="insight"
      >
        <div className={styles.railHead}>
          <span className={styles.railIcon}>
            <HomeCleanRailInsightIcon />
          </span>
          <h2 className={styles.railTitle}>{HOME_CLEAN_COPY.rail.insight}</h2>
        </div>
        <p className={styles.railBody}>{T.home.insight.body}</p>
      </section>
    </div>
  );
}
