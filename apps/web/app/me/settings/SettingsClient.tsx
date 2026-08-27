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
import { useCallback, useEffect, useRef, useState } from "react";
import {
  PremiumCard,
  PremiumEmptyState,
  PremiumSurface,
} from "../../../components/putduk-premium";
import {
  AccountAuthActions,
  AccountFrame,
  type AccountView,
} from "../AccountFrame";
import { HUB_COPY } from "../account-hub-copy";
import styles from "./settings-premium.module.css";

function sessionToken(): string | null {
  return null;
}

function isAuthFailure(err: unknown): boolean {
  return isAuthError(err) && (err.status === 401 || err.status === 403);
}

export function SettingsClient() {
  const [view, setView] = useState<AccountView>("loading");
  const [phrase, setPhrase] = useState("");
  const [confirmAgain, setConfirmAgain] = useState(false);
  const [actionView, setActionView] = useState<
    "idle" | "logout-unavail" | "delete-unavail" | "delete-success"
  >("idle");
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const logoutInFlightRef = useRef(false);
  const deleteInFlightRef = useRef(false);

  const onPrefsAuthFailure = useCallback(() => {
    setView("unauthorized");
  }, []);

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
        if (isAuthFailure(err)) {
          setView("unauthorized");
          return;
        }
        setView("unavailable");
      }
    })();
    return () => ac.abort();
  }, []);

  function logout() {
    if (logoutInFlightRef.current) return;
    logoutInFlightRef.current = true;
    setLogoutBusy(true);
    void (async () => {
      try {
        await logoutAuth({ getAccessToken: sessionToken });
        setView("unauthorized");
      } catch (err) {
        if (isAuthFailure(err)) {
          setView("unauthorized");
          return;
        }
        setActionView("logout-unavail");
        logoutInFlightRef.current = false;
        setLogoutBusy(false);
      }
    })();
  }

  function removeAccount() {
    if (phrase !== DELETE_ACCOUNT_CONFIRM_PHRASE) return;
    if (confirmAgain !== true) return;
    if (deleteInFlightRef.current) return;
    deleteInFlightRef.current = true;
    setDeleteBusy(true);
    void (async () => {
      try {
        await deleteAuthAccount(
          { confirmPhrase: phrase, confirmAgain },
          { getAccessToken: sessionToken },
        );
        setActionView("delete-success");
        setView("unauthorized");
      } catch (err) {
        if (isAuthFailure(err)) {
          setView("unauthorized");
          return;
        }
        setActionView("delete-unavail");
        deleteInFlightRef.current = false;
        setDeleteBusy(false);
      }
    })();
  }

  if (view === "loading") {
    return (
      <AccountFrame title={T.settings.title} view="loading" testId="settings-page">
        <PremiumSurface
          as="section"
          className={styles.surface}
          aria-busy="true"
          aria-live="polite"
        >
          <p className={`pt-premium-description ${styles.stateCopy}`}>
            {T.settings.loading}
          </p>
        </PremiumSurface>
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
        <PremiumSurface as="section" className={styles.surface}>
          <PremiumEmptyState
            title={HUB_COPY.loginTitle}
            description={T.settings.loginToView}
            action={<AccountAuthActions />}
          />
          {actionView === "delete-success" ? (
            <p
              className={styles.accountStatus}
              data-tone="success"
              role="status"
            >
              {T.settings.deleteAccepted}
            </p>
          ) : null}
        </PremiumSurface>
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
        <PremiumSurface as="section" className={styles.surface}>
          <PremiumEmptyState
            title={HUB_COPY.unavailableTitle}
            description={T.settings.pageUnavailable}
          />
        </PremiumSurface>
      </AccountFrame>
    );
  }

  return (
    <AccountFrame title={T.settings.title} view="ready" testId="settings-page" hideTitle>
      <div className={styles.page}>
        <p className={`pt-premium-kicker ${styles.kicker}`}>{HUB_COPY.kicker}</p>
        <PremiumSurface
          as="section"
          className={styles.surface}
          aria-label={T.settings.title}
        >
          <div className={styles.owner}>
            <SettingsPanel onPrefsAuthFailure={onPrefsAuthFailure} />
          </div>
        </PremiumSurface>
        <PremiumCard className={styles.accountCard} data-testid="settings-account-card">
          <h2 className={styles.accountTitle}>{T.settings.accountSection}</h2>
          <div className={styles.actions}>
            <button
              type="button"
              data-testid="settings-logout"
              disabled={logoutBusy}
              aria-busy={logoutBusy}
              onClick={() => logout()}
            >
              {logoutBusy ? T.settings.logoutBusy : T.settings.logout}
            </button>
          </div>
          {actionView === "logout-unavail" ? (
            <p
              className={styles.accountStatus}
              data-tone="warning"
              role="status"
              data-testid="settings-logout-status"
            >
              {T.settings.logoutUnavailable}
            </p>
          ) : null}
        </PremiumCard>
        <PremiumCard className={styles.accountCard} data-testid="settings-delete-card">
          <h2 className={styles.accountTitle}>{T.settings.deleteTitle}</h2>
          <p className={styles.accountNote}>{T.settings.deleteLead}</p>
          <div className={styles.field}>
            <label htmlFor="delete-account-phrase">{DELETE_ACCOUNT_CONFIRM_PHRASE}</label>
            <input
              id="delete-account-phrase"
              data-testid="delete-account-phrase"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              autoComplete="off"
              disabled={deleteBusy}
            />
            <label>
              <input
                type="checkbox"
                data-testid="delete-account-confirm"
                checked={confirmAgain}
                onChange={(e) => setConfirmAgain(e.target.checked)}
                disabled={deleteBusy}
              />{" "}
              {T.settings.deleteConfirmAgain}
            </label>
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondary}
              data-testid="delete-account-submit"
              disabled={deleteBusy}
              aria-busy={deleteBusy}
              onClick={() => removeAccount()}
            >
              {deleteBusy ? T.settings.deleteBusy : T.settings.deleteSubmit}
            </button>
          </div>
          {actionView === "delete-unavail" ? (
            <p
              className={styles.accountStatus}
              data-tone="danger"
              role="status"
              data-testid="settings-delete-status"
            >
              {T.settings.deleteUnavailable}
            </p>
          ) : null}
        </PremiumCard>
      </div>
    </AccountFrame>
  );
}
