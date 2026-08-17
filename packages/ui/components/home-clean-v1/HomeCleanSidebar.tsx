import { forwardRef } from "react";
import Link from "next/link";
import { T } from "../../copy/ko";
import { HOME_CLEAN_ASSET } from "./home-clean-assets";
import { HomeCleanNavIcon } from "./home-clean-nav-icons";
import type { HomeCleanNavItem } from "./home-clean.types";
import styles from "./HomeCleanNav.module.css";

export const HomeCleanSidebar = forwardRef<
  HTMLElement,
  { items: readonly HomeCleanNavItem[] }
>(function HomeCleanSidebar({ items }, ref) {
  return (
    <aside ref={ref} className={styles.sidebar}>
      <p className={styles.brand}>
        <img
          className={styles.brandMark}
          src={HOME_CLEAN_ASSET.brandSymbol}
          alt=""
        />
        <span>{T.brand.consumer}</span>
      </p>
      <nav className={styles.desktopNav} aria-label={T.home.sidebar.navAria}>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={styles.desktopItem}
            aria-current={item.active ? "page" : undefined}
          >
            <HomeCleanNavIcon iconId={item.iconId} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className={styles.sidebarFoot}>
        <div className={styles.aiCard}>
          <img
            className={styles.aiRobot}
            src={HOME_CLEAN_ASSET.robotSidebarOpenHands}
            alt={T.home.aiSummary.robotAlt}
          />
          <div className={styles.aiCopy}>
            <p className={styles.aiLine}>{T.home.sidebar.aiLine1}</p>
            <p className={styles.aiCta}>{T.home.sidebar.aiLine2}</p>
          </div>
        </div>
        <Link
          href="/me/support"
          className={styles.support}
          aria-label={T.home.sidebar.supportAria}
        >
          <p className={styles.supportTitle}>{T.home.sidebar.supportTitle}</p>
          <p className={styles.supportHours}>{T.home.sidebar.supportHours}</p>
        </Link>
      </div>
    </aside>
  );
});
