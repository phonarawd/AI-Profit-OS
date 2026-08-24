"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./account.module.css";

export type AccountView =
  | "loading"
  | "ready"
  | "unauthorized"
  | "unavailable"
  | "disabled"
  | "empty"
  | "success";

export function AccountFrame({
  title,
  view,
  testId,
  showHubLink = true,
  hideTitle = false,
  children,
}: {
  title: string;
  view: AccountView;
  testId: string;
  showHubLink?: boolean;
  hideTitle?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={styles.page}
      data-testid={testId}
      data-account-view={view}
      data-account-hub-link={showHubLink ? "available" : "hidden"}
    >
      {hideTitle ? null : <h1 className={styles.title}>{title}</h1>}
      {children}
    </div>
  );
}

export function AccountAuthActions() {
  return (
    <div className={styles.actions}>
      <Link href="/auth/login">로그인</Link>
      <Link className={styles.secondary} href="/">
        홈으로
      </Link>
    </div>
  );
}
