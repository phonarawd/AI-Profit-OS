import Link from "next/link";
import { T } from "../../copy/ko";
import { HOME_CLEAN_CTA_HREF } from "./home-clean.types";
import type { HomeCleanDataMode } from "./home-clean.types";
import styles from "./HomeCleanCards.module.css";

export function HomeCleanDiscovery({
  heroHref = HOME_CLEAN_CTA_HREF.hero,
  mode,
}: {
  heroHref?: string;
  mode: HomeCleanDataMode;
}) {
  return (
    <section
      id="home-opportunity"
      className={styles.discoveryWrap}
      aria-label={T.home.discovery.aria}
      data-hc-mode={mode}
    >
      <div className={styles.discoveryIntro}>
        <h2 className={styles.discoveryTitle}>{T.home.hero.title}</h2>
        <Link className={styles.discoveryCta} href={heroHref}>
          {T.home.hero.cta}
        </Link>
      </div>
    </section>
  );
}
