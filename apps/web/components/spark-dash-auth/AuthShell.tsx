"use client";

import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { T } from "@aipo/ui/copy/ko";
import { SD_ASSETS } from "../spark-dash-home/assets";
import { AuthShellContext } from "./AuthShellContext";
import styles from "./auth-shell.module.css";
import type { AuthShellVariant } from "./types";
import { authShellCopy } from "./shell-copy";

function subscribeDesktop(onChange: () => void) {
  const mq = window.matchMedia("(min-width: 1024px)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function desktopSnapshot() {
  return window.matchMedia("(min-width: 1024px)").matches;
}

function copyFor(variant: AuthShellVariant) {
  return authShellCopy(variant);
}

function BrandLockup({ compact }: { compact?: boolean }) {
  return (
    <div className={compact ? styles.mobileBrand : styles.brandLockup}>
      {compact ? <span className={styles.mobileDot} aria-hidden /> : null}
      <p className={compact ? styles.mobileBrandName : styles.brandName}>
        {T.brand.consumer}
      </p>
      <p className={compact ? styles.mobileBrandSpark : styles.brandSpark}>
        ↯
      </p>
    </div>
  );
}

export function AuthShell({
  variant,
  children,
}: {
  variant: AuthShellVariant;
  children: ReactNode;
}) {
  const desktop = useSyncExternalStore(subscribeDesktop, desktopSnapshot, () => false);
  const copy = copyFor(variant);

  return (
    <AuthShellContext.Provider value={{ variant, embedded: true }}>
      <div
        className={styles.page}
        data-testid="auth-shell"
        data-auth-variant={variant}
        data-auth-layout={desktop ? "desktop" : "mobile"}
      >
        {desktop ? (
          <div className={styles.desktop}>
            <aside className={styles.brandPanel} aria-label="퍼뜩 소개">
              <div className={styles.brandWash} aria-hidden />
              <img
                className={styles.brandGlow}
                src={SD_ASSETS.sparkMark}
                alt=""
                width={40}
                height={40}
              />
              <BrandLockup />
              <h1 className={styles.brandTitle}>{copy.title}</h1>
              <p className={styles.brandSub}>{copy.sub}</p>
              <p className={styles.brandNote}>{copy.note}</p>
            </aside>
            <div className={styles.formColumn}>
              <div className={styles.authCard}>{children}</div>
              <p className={styles.operatorFooter}>{T.legal.operator.footerLine}</p>
            </div>
          </div>
        ) : (
          <div className={styles.mobile}>
            <header className={styles.masthead}>
              <img
                className={styles.mastheadGlow}
                src={SD_ASSETS.mobileBrandSpark}
                alt=""
                width={130}
                height={130}
              />
              <BrandLockup compact />
              <h1 className={styles.mobileTitle}>{copy.title}</h1>
              <p className={styles.mobileSub}>{copy.sub}</p>
            </header>
            <div className={styles.mobileBody}>
              <div className={styles.mobileCard}>{children}</div>
              <p className={styles.mobileOperator}>{T.legal.operator.footerLine}</p>
            </div>
          </div>
        )}
      </div>
    </AuthShellContext.Provider>
  );
}
