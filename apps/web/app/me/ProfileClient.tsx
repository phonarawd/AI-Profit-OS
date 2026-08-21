"use client";

import {
  fetchAuthSession,
  isAuthError,
  logoutAuth,
} from "@aipo/sdk/auth";
import { T } from "@aipo/ui/copy/ko";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AccountAuthActions,
  AccountFrame,
  type AccountView,
} from "./AccountFrame";
import styles from "./account.module.css";

const PRIMARY = [
  { href: "/me/inbox", title: T.user.me.inbox, body: "놓친 안내를 확인해요" },
  { href: "/me/invite", title: T.user.me.invite, body: "친구를 부르고 코드를 연결해요" },
  { href: "/me/settings", title: T.user.me.settings, body: "알림과 계정 설정을 바꿔요" },
  { href: "/me/kyc", title: T.user.me.kyc, body: "출금할 때 본인 확인이 필요해요" },
  { href: "/me/support", title: T.user.me.support, body: "문제가 생기면 여기로 와요" },
  { href: "/me/peotteok", title: T.user.me.peotteok, body: "궁금한 점을 물어보세요" },
  { href: "/wallet", title: "지갑", body: "잔액과 입출금을 봐요" },
  { href: "/me/guide/faq", title: "이용 안내", body: "처음 쓰는 분도 쉽게 봐요" },
  { href: "/me/legal", title: T.user.me.legal, body: "이용 조건을 확인해요" },
] as const;

const COMPAT = [
  { href: "/me/benefits", title: T.user.me.benefits },
  { href: "/me/membership", title: T.user.me.membership },
  { href: "/me/events", title: T.user.me.events },
  { href: "/me/strategies", title: T.user.me.strategies },
] as const;

function sessionToken(): string | null {
  return null;
}

export function ProfileClient() {
  const [view, setView] = useState<AccountView>("loading");
  const [stage, setStage] = useState<string | null>(null);
  const [logoutView, setLogoutView] = useState<"idle" | "saving" | "unavailable">(
    "idle",
  );

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      try {
        const session = await fetchAuthSession({
          getAccessToken: sessionToken,
          signal: ac.signal,
        });
        if (ac.signal.aborted) return;
        if (!session) {
          setStage(null);
          setView("unauthorized");
          return;
        }
        setStage(session.onboardingStage);
        setView("ready");
      } catch (err) {
        if (ac.signal.aborted) return;
        if (isAuthError(err) && err.status === 401) {
          setStage(null);
          setView("unauthorized");
          return;
        }
        setStage(null);
        setView("unavailable");
      }
    })();
    return () => ac.abort();
  }, []);

  async function logout() {
    setLogoutView("saving");
    try {
      await logoutAuth({ getAccessToken: sessionToken });
      setStage(null);
      setView("unauthorized");
      setLogoutView("idle");
    } catch {
      setLogoutView("unavailable");
    }
  }

  if (view === "loading") {
    return (
      <AccountFrame
        title={T.user.me.title}
        view="loading"
        testId="me-hub"
        showHubLink={false}
      >
        <p className={styles.lead}>불러오는 중…</p>
      </AccountFrame>
    );
  }

  if (view === "unauthorized") {
    return (
      <AccountFrame
        title={T.user.me.title}
        view="unauthorized"
        testId="me-hub"
        showHubLink={false}
      >
        <p className={styles.lead}>로그인하면 계정을 볼 수 있어요.</p>
        <AccountAuthActions />
      </AccountFrame>
    );
  }

  if (view === "unavailable") {
    return (
      <AccountFrame
        title={T.user.me.title}
        view="unavailable"
        testId="me-hub"
        showHubLink={false}
      >
        <p className={styles.err}>계정 상태를 확인할 수 없음</p>
      </AccountFrame>
    );
  }

  return (
    <AccountFrame
      title={T.user.me.title}
      view="ready"
      testId="me-hub"
      showHubLink={false}
    >
      <p className={styles.note} data-testid="account-stage">
        {stage === "B_complete"
          ? "프로필이 준비되어 있어요."
          : "프로필을 아직 마치지 않았어요."}
      </p>
      {stage && stage !== "B_complete" ? (
        <div className={styles.actions}>
          <Link href="/auth/complete-profile">프로필 이어서 작성</Link>
        </div>
      ) : null}
      <div className={styles.cardList}>
        {PRIMARY.map((item) => (
          <Link key={item.href} href={item.href}>
            <p className={styles.cardTitle}>{item.title}</p>
            <p className={styles.cardBody}>{item.body}</p>
          </Link>
        ))}
      </div>
      <h2 className={styles.sectionTitle}>기타</h2>
      <div className={styles.cardList} data-testid="account-compat">
        {COMPAT.map((item) => (
          <Link key={item.href} href={item.href}>
            <p className={styles.cardTitle}>{item.title}</p>
          </Link>
        ))}
      </div>
      <div className={styles.actions}>
        <button type="button" data-testid="account-logout" onClick={() => void logout()}>
          로그아웃
        </button>
      </div>
      {logoutView === "unavailable" ? (
        <p className={styles.err}>지금은 로그아웃할 수 없음</p>
      ) : null}
    </AccountFrame>
  );
}
