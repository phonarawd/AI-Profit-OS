import { T } from "../../copy/ko";
import { HOME_CLEAN_ASSET } from "./home-clean-assets";
import {
  HOME_CLEAN_COPY,
  homeCleanAiSummaryTitle,
} from "./home-clean-copy";
import type { HomeCleanDataMode, HomeCleanViewState } from "./home-clean.types";
import styles from "./HomeCleanCards.module.css";
import responsive from "./HomeCleanResponsive.module.css";

export function HomeCleanAiSummary({
  viewState,
  foundCountText,
  averageReturnText,
  averageDurationText,
  mode,
}: {
  viewState: HomeCleanViewState;
  foundCountText: string;
  averageReturnText: string;
  averageDurationText: string;
  mode: HomeCleanDataMode;
}) {
  const title = homeCleanAiSummaryTitle(viewState);

  return (
    <section
      className={`${styles.aiWrap} ${responsive.aiWrap}`}
      aria-label={HOME_CLEAN_COPY.aiSummary.aria}
      data-hc-mode={mode}
    >
      <div className={`${styles.aiCard} ${responsive.aiCard}`}>
        <div className={`${styles.aiCopy} ${responsive.aiCopy}`}>
          <h2 className={`${styles.aiTitle} ${responsive.aiTitle}`}>{title}</h2>
          <p className={`${styles.aiStatus} ${responsive.aiStatus}`}>
            {HOME_CLEAN_COPY.absent.checking}
          </p>
        </div>
        <div className={`${styles.aiRobotSlot} ${responsive.aiRobotSlot}`}>
          <img
            className={`${styles.aiRobot} ${styles.aiRobotDesktop} ${responsive.aiRobot}`}
            src={HOME_CLEAN_ASSET.robotAiSummaryDesktop}
            alt={T.home.aiSummary.robotAlt}
            width={1536}
            height={1024}
            data-hc-robot="desktop"
          />
          <img
            className={`${styles.aiRobot} ${styles.aiRobotMobile} ${responsive.aiRobot}`}
            src={HOME_CLEAN_ASSET.robotAiSummaryMobile}
            alt={T.home.aiSummary.robotAlt}
            width={1024}
            height={1536}
            data-hc-robot="mobile"
          />
        </div>
        <div className={`${styles.aiMetrics} ${responsive.aiMetrics}`}>
          <div className={`${styles.aiMetric} ${responsive.aiMetric}`}>
            <img
              className={styles.aiMetricIcon}
              src={HOME_CLEAN_ASSET.metricSearch}
              alt=""
            />
            <div className={styles.aiMetricBody}>
              <p className={styles.aiMetricLabel}>
                {T.home.aiSummary.foundLabel}
              </p>
              <p className={`${styles.aiMetricValue} ${responsive.aiMetricValue}`}>
                {foundCountText}
              </p>
            </div>
          </div>
          <div className={`${styles.aiMetric} ${responsive.aiMetric}`}>
            <img
              className={styles.aiMetricIcon}
              src={HOME_CLEAN_ASSET.metricOpportunity}
              alt=""
            />
            <div className={styles.aiMetricBody}>
              <p className={styles.aiMetricLabel}>
                {T.home.aiSummary.averageReturnLabel}
              </p>
              <p className={`${styles.aiMetricValue} ${responsive.aiMetricValue}`}>
                {averageReturnText}
              </p>
            </div>
          </div>
          <div className={`${styles.aiMetric} ${responsive.aiMetric}`}>
            <img
              className={styles.aiMetricIcon}
              src={HOME_CLEAN_ASSET.metricTime}
              alt=""
            />
            <div className={styles.aiMetricBody}>
              <p className={styles.aiMetricLabel}>
                {T.home.aiSummary.averageDurationLabel}
              </p>
              <p className={`${styles.aiMetricValue} ${responsive.aiMetricValue}`}>
                {averageDurationText}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
