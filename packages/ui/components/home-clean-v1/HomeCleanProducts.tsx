import Link from "next/link";
import { T } from "../../copy/ko";
import { HOME_CLEAN_COPY } from "./home-clean-copy";
import type {
  HomeCleanDataMode,
  HomeCleanProductView,
} from "./home-clean.types";
import styles from "./HomeCleanCards.module.css";
import responsive from "./HomeCleanResponsive.module.css";

export function HomeCleanProducts({
  items,
  mode,
}: {
  items: readonly HomeCleanProductView[];
  mode: HomeCleanDataMode;
}) {
  return (
    <section
      className={`${styles.productsWrap} ${responsive.productsWrap}`}
      aria-label={T.home.featured.aria}
      data-hc-mode={mode}
    >
      <h2 className={styles.productsTitle}>{T.home.featured.title}</h2>
      {items.length === 0 ? (
        <p className={styles.productsEmpty}>{T.home.opportunity.emptyStatus}</p>
      ) : (
        <div className={`${styles.productsGrid} ${responsive.productsGrid}`}>
          {items.map((item) => (
            <article
              key={item.id}
              className={`${styles.productCard} ${responsive.productCard}`}
            >
              <div className={styles.productImageBox}>
                {item.imageSrc ? (
                  <img
                    className={styles.productImage}
                    src={item.imageSrc}
                    alt={item.imageAlt}
                  />
                ) : (
                  <div className={styles.productImageMissing} aria-hidden />
                )}
              </div>
              <h3 className={styles.productName}>{item.titleText}</h3>
              <dl className={styles.productMeta}>
                <div className={styles.productMetaRow}>
                  <dt>{HOME_CLEAN_COPY.requiredPrincipal.label}</dt>
                  <dd>{item.requiredPrincipal.text}</dd>
                </div>
                <div className={styles.productMetaRow}>
                  <dt>{T.home.categoryVisual.expectedLabel}</dt>
                  <dd>{item.expectedProfit.text}</dd>
                </div>
                <div className={styles.productMetaRow}>
                  <dt>{T.home.featured.durationLabel}</dt>
                  <dd>{item.duration.text}</dd>
                </div>
              </dl>
              <Link className={styles.productCta} href={item.href}>
                {T.home.hero.cta}
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
