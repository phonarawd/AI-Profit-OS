"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { PremiumStatus } from "../../components/putduk-premium";
import styles from "./account.module.css";

export type AccountView =
  | "loading"
  | "ready"
  | "unauthorized"
  | "unavailable"
  | "disabled"
  | "empty"
  | "success";

function viewStatus(view: AccountView): {
  label: string;
  tone: "neutral" | "live" | "success" | "warning" | "danger";
  live?: boolean;
} | null {
  if (view === "ready") return null;
  if (view === "loading") return { label: "불러오는 중", tone: "live", live: true };
  if (view === "unauthorized") return { label: "로그인 필요", tone: "warning" };
  if (view === "unavailable") return { label: "잠시 확인이 필요해요", tone: "warning" };
  if (view === "disabled") return { label: "현재 이용할 수 없어요", tone: "neutral" };
  if (view === "empty") return { label: "아직 내용이 없어요", tone: "neutral" };
  if (view === "success") return { label: "완료", tone: "success" };
  return null;
}

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
  const status = viewStatus(view);

  return (
    <div
      className={styles.page}
      data-testid={testId}
      data-account-view={view}
      data-account-hub-link={showHubLink ? "available" : "hidden"}
    >
      {hideTitle ? null : (
        <header className={styles.frameHeader}>
          <div className={styles.frameHeading}>
            <p className={styles.eyebrow}>내 계정</p>
            <h1 className={styles.title}>{title}</h1>
          </div>
          {status ? (
            <PremiumStatus label={status.label} tone={status.tone} live={status.live} />
          ) : null}
        </header>
      )}
      <div className={styles.frameBody}>{children}</div>
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
