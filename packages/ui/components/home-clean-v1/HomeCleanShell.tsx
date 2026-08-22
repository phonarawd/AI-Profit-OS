"use client";

import {
  useLayoutEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { usePathname } from "next/navigation";
import { T } from "../../copy/ko";
import { HomeCleanHeader } from "./HomeCleanHeader";
import { HomeCleanMobileNav } from "./HomeCleanMobileNav";
import { buildHomeCleanNavigationModel } from "./HomeCleanNavigationModel";
import { HomeCleanRightRail } from "./HomeCleanRightRail";
import { HomeCleanSidebar } from "./HomeCleanSidebar";
import { HOME_CLEAN_ASSET } from "./home-clean-assets";
import type {
  HomeCleanDataMode,
  HomeCleanSessionStatus,
  HomeCleanTabSource,
  HomeCleanViewState,
  HomeCleanViewerIdentity,
} from "./home-clean.types";
import { HOME_CLEAN_CTA_HREF } from "./home-clean.types";
import "./HomeCleanTokens.module.css";
import styles from "./HomeCleanShell.module.css";

const HOME_CLEAN_ASSET_ENTRIES = Object.entries(HOME_CLEAN_ASSET) as [
  keyof typeof HOME_CLEAN_ASSET,
  (typeof HOME_CLEAN_ASSET)[keyof typeof HOME_CLEAN_ASSET],
][];

function applyA11yHidden(el: HTMLElement | null, hide: boolean) {
  if (!el) return;
  if (hide) {
    el.setAttribute("hidden", "");
    el.setAttribute("inert", "");
    el.setAttribute("aria-hidden", "true");
  } else {
    el.removeAttribute("hidden");
    el.removeAttribute("inert");
    el.removeAttribute("aria-hidden");
  }
}

function useHomeCleanNavA11y(
  surfaceRef: RefObject<HTMLDivElement | null>,
  desktopRef: RefObject<HTMLElement | null>,
  mobileRef: RefObject<HTMLElement | null>,
) {
  useLayoutEffect(() => {
    const sync = () => {
      const surface = surfaceRef.current;
      const raw = surface
        ? getComputedStyle(surface).getPropertyValue("--hc-bp-md")
        : "768px";
      const md = Number.parseInt(raw, 10) || 768;
      const isDesktop = document.documentElement.clientWidth >= md;
      applyA11yHidden(desktopRef.current, !isDesktop);
      applyA11yHidden(mobileRef.current, isDesktop);
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [desktopRef, mobileRef, surfaceRef]);
}

export function HomeCleanShell({
  tabs,
  children,
  viewer = {},
  viewState,
  sessionStatus,
  mode,
  inboxHref = HOME_CLEAN_CTA_HREF.inbox,
  meHref = HOME_CLEAN_CTA_HREF.me,
}: {
  tabs: readonly HomeCleanTabSource[];
  children: ReactNode;
  viewer?: HomeCleanViewerIdentity;
  viewState?: HomeCleanViewState;
  sessionStatus?: HomeCleanSessionStatus;
  mode?: HomeCleanDataMode;
  inboxHref?: string;
  meHref?: string;
}) {
  const pathname = usePathname() || "/";
  const items = buildHomeCleanNavigationModel(tabs, pathname);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const desktopRef = useRef<HTMLElement>(null);
  const mobileRef = useRef<HTMLElement>(null);
  useHomeCleanNavA11y(surfaceRef, desktopRef, mobileRef);

  return (
    <div
      ref={surfaceRef}
      className={styles.root}
      data-ui-surface="home-clean-v1"
      data-hc-view-state={viewState}
      data-hc-session={sessionStatus}
      data-hc-mode={mode}
    >
      <HomeCleanSidebar ref={desktopRef} items={items} />
      <div className={styles.column}>
        <HomeCleanHeader
          viewer={viewer}
          inboxHref={inboxHref}
          meHref={meHref}
        />
        <main className={styles.main}>
          <div className={styles.primary}>
            <div
              className={styles.assetAudit}
              data-hc-asset-audit=""
              aria-hidden="true"
            >
              {HOME_CLEAN_ASSET_ENTRIES.map(([id, src]) => (
                <img
                  key={id}
                  className={styles.assetAuditImg}
                  data-hc-asset={id}
                  src={src}
                  alt=""
                />
              ))}
            </div>
            {children}
          </div>
          <aside className={styles.rail} aria-label={T.home.rightRail.aria}>
            <HomeCleanRightRail mode={mode} />
          </aside>
        </main>
      </div>
      <HomeCleanMobileNav ref={mobileRef} items={items} />
    </div>
  );
}
