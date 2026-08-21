"use client";

import {
  DELETE_ACCOUNT_CONFIRM_PHRASE,
  deleteAuthAccount,
  fetchAuthSession,
  isAuthError,
  logoutAuth,
} from "@aipo/sdk/auth";
import { SettingsPanel } from "@aipo/ui/components/settings/SettingsPanel";
import { T } from "@aipo/ui/copy/ko";
import { useEffect, useState } from "react";
import {
  AccountAuthActions,
  AccountFrame,
  type AccountView,
} from "../AccountFrame";
import styles from "../account.module.css";

function sessionToken(): string | null {
  return null;
}

export function SettingsClient() {
  const [view, setView] = useState<AccountView>("loading");
  const [phrase, setPhrase] = useState("");
  const [confirmAgain, setConfirmAgain] = useState(false);
  const [actionView, setActionView] = useState<
    "idle" | "logout-unavail" | "delete-unavail" | "delete-success"
  >("idle");

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      try {
        const session = await fetchAuthSession({
          getAccessToken: sessionToken,
          signal: ac.signal,
        });
        if (ac.signal.aborted) return;
        setView(session ? "ready" : "unauthorized");
      } catch (err) {
        if (ac.signal.aborted) return;
        if (isAuthError(err) && err.status === 401) {
          setView("unauthorized");
          return;
        }
        setView("unavailable");
      }
    })();
    return () => ac.abort();
  }, []);

  async function logout() {
    try {
      await logoutAuth({ getAccessToken: sessionToken });
      setView("unauthorized");
    } catch {
      setActionView("logout-unavail");
    }
  }

  async function removeAccount() {
    try {
      await deleteAuthAccount(
        { confirmPhrase: phrase, confirmAgain },
        { getAccessToken: sessionToken },
      );
      setActionView("delete-success");
      setView("unauthorized");
    } catch {
      setActionView("delete-unavail");
    }
  }

  if (view === "loading") {
    return (
      <AccountFrame title={T.settings.title} view="loading" testId="settings-page">
        <p className={styles.lead}>불러오는 중…</p>
      </AccountFrame>
    );
  }

  if (view === "unauthorized") {
    return (
      <AccountFrame
        title={T.settings.title}
        view="unauthorized"
        testId="settings-page"
      >
        <p className={styles.lead}>로그인하면 설정을 볼 수 있어요.</p>
        {actionView === "delete-success" ? (
          <p className={styles.note}>계정 삭제 요청이 접수되었어요.</p>
        ) : null}
        <AccountAuthActions />
      </AccountFrame>
    );
  }

  if (view === "unavailable") {
    return (
      <AccountFrame
        title={T.settings.title}
        view="unavailable"
        testId="settings-page"
      >
        <p className={styles.err}>설정을 확인할 수 없음</p>
      </AccountFrame>
    );
  }

  return (
    <AccountFrame title={T.settings.title} view="ready" testId="settings-page" hideTitle>
      <div className={styles.surface}>
        <SettingsPanel />
      </div>
      <h2 className={styles.sectionTitle}>계정</h2>
      <div className={styles.actions}>
        <button type="button" data-testid="settings-logout" onClick={() => void logout()}>
          로그아웃
        </button>
      </div>
      {actionView === "logout-unavail" ? (
        <p className={styles.err}>지금은 로그아웃할 수 없음</p>
      ) : null}
      <h2 className={styles.sectionTitle}>계정 삭제</h2>
      <p className={styles.note}>
        정말 삭제하려면 아래 문구를 그대로 입력하세요.
      </p>
      <div className={styles.field}>
        <label htmlFor="delete-account-phrase">{DELETE_ACCOUNT_CONFIRM_PHRASE}</label>
        <input
          id="delete-account-phrase"
          data-testid="delete-account-phrase"
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          autoComplete="off"
        />
        <label>
          <input
            type="checkbox"
            data-testid="delete-account-confirm"
            checked={confirmAgain}
            onChange={(e) => setConfirmAgain(e.target.checked)}
          />{" "}
          다시 확인했어요
        </label>
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.secondary}
          data-testid="delete-account-submit"
          onClick={() => void removeAccount()}
        >
          계정 삭제 요청
        </button>
      </div>
      {actionView === "delete-unavail" ? (
        <p className={styles.err}>계정 삭제를 완료했다고 표시할 수 없음</p>
      ) : null}
    </AccountFrame>
  );
}
