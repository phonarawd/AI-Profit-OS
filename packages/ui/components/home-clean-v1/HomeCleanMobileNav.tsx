import { forwardRef } from "react";
import Link from "next/link";
import { T } from "../../copy/ko";
import { HomeCleanNavIcon } from "./home-clean-nav-icons";
import type { HomeCleanNavItem } from "./home-clean.types";
import styles from "./HomeCleanNav.module.css";

export const HomeCleanMobileNav = forwardRef<
  HTMLElement,
  { items: readonly HomeCleanNavItem[] }
>(function HomeCleanMobileNav({ items }, ref) {
  return (
    <nav
      ref={ref}
      className={styles.mobileNav}
      aria-label={T.home.sidebar.navAria}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={styles.mobileItem}
          aria-current={item.active ? "page" : undefined}
        >
          <HomeCleanNavIcon iconId={item.iconId} />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
});
