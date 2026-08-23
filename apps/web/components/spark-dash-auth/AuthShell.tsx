"use client";

import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { T } from "@aipo/ui/copy/ko";
import { SD_ASSETS } from "../spark-dash-home/assets";
import { AuthShellContext } from "./AuthShellContext";
import styles from "./auth-shell.module.css";
import type { AuthShellVariant } from "./types";

function subscribeDesktop(onChange: () => void) {
  const mq = window.matchMedia("(min-width: 1024px)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function desktopSnapshot() {
  return window.matchMedia("(min-width: 1024px)").matches;
}

function copyFor(variant: AuthShellVariant) {
  if (variant === "signup") {
    return {
      title: T.auth.signupHeadline,
      sub: T.auth.signupSub,
      note: "약관에 동의한 뒤에만 카카오로 시작할 수 있어요. 표시 이름·연락처는 다음 단계에서 받아요.",
    };
  }
  if (variant === "complete-profile") {
    return {
      title: T.auth.completeHeadline,
      sub: T.auth.completeSub,
      note: "서비스 이용에 필요한 기본 정보만 받아요. 본인확인은 별도 절차이며, 출금 전에 안내해 드려요.",
    };
  }
  return {
    title: T.auth.loginHeadline,
    sub: T.auth.loginSub,
    note: "카카오로 시작하거나, 이 기기에서 패스키·이메일 링크로 들어와요. Google은 아직 열려 있지 않아요.",
  };
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
