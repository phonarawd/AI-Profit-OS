"use client";

import { useEffect, useState } from "react";
import {
  MembershipHome,
  type MembershipMeModel,
} from "@aipo/ui/components/membership";
import {
  PremiumEmptyState,
  PremiumSurface,
} from "../../../components/putduk-premium";
import {
  AccountAuthActions,
  AccountFrame,
  type AccountView,
} from "../AccountFrame";
import { HUB_COPY } from "../account-hub-copy";
import styles from "./membership-premium.module.css";

const TITLE = HUB_COPY.membership;
const LOADING = HUB_COPY.loadingEllipsis;
const LOGIN_TITLE = HUB_COPY.loginTitle;
const LOGIN_LINE =
  "\uB85C\uADF8\uC778\uD558\uBA74 \uBA64\uBC84\uC2ED\uC744 \uBCFC \uC218 \uC788\uC5B4\uC694.";
const UNAVAILABLE_TITLE = HUB_COPY.unavailableTitle;
const UNAVAILABLE =
  "\uBA64\uBC84\uC2ED\uC744 \uD655\uC778\uD560 \uC218 \uC5C6\uC74C";

function isMembershipMe(value: unknown): value is MembershipMeModel {
  if (value == null || typeof value !== "object") return false;
  const membership = (value as { membership?: unknown }).membership;
  return typeof membership === "string" && membership.trim().length > 0;
}

export default function Page() {
  const [view, setView] = useState<AccountView>("loading");
  const [data, setData] = useState<MembershipMeModel | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      try {
        const res = await fetch("/api/v1/me/membership", {
          credentials: "include",
          headers: { Accept: "application/json" },
          signal: ac.signal,
        });
        if (ac.signal.aborted) return;
        if (res.status === 401 || res.status === 403) {
          setData(null);
          setView("unauthorized");
          return;
        }
        if (!res.ok) {
          setData(null);
          setView("unavailable");
          return;
        }
        let json: unknown;
        try {
          json = await res.json();
        } catch {
          if (ac.signal.aborted) return;
          setData(null);
          setView("unavailable");
          return;
        }
        if (ac.signal.aborted) return;
        if (!isMembershipMe(json)) {
          setData(null);
          setView("unavailable");
          return;
        }
        setData(json);
        setView("ready");
      } catch (err) {
        if (ac.signal.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setData(null);
        setView("unavailable");
      }
    })();
    return () => ac.abort();
  }, []);

  if (view === "loading") {
    return (
      <AccountFrame title={TITLE} view="loading" testId="membership-page">
        <PremiumSurface
          as="section"
          className={styles.surface}
          aria-busy="true"
          aria-live="polite"
        >
          <p className={`pt-premium-description ${styles.stateCopy}`}>{LOADING}</p>
        </PremiumSurface>
      </AccountFrame>
    );
  }
  if (view === "unauthorized") {
    return (
      <AccountFrame title={TITLE} view="unauthorized" testId="membership-page">
        <PremiumSurface as="section" className={styles.surface}>
          <PremiumEmptyState
            title={LOGIN_TITLE}
            description={LOGIN_LINE}
            action={<AccountAuthActions />}
          />
        </PremiumSurface>
      </AccountFrame>
    );
  }
  if (view === "unavailable" || data == null) {
    return (
      <AccountFrame title={TITLE} view="unavailable" testId="membership-page">
        <PremiumSurface as="section" className={styles.surface}>
          <PremiumEmptyState
            title={UNAVAILABLE_TITLE}
            description={UNAVAILABLE}
          />
        </PremiumSurface>
      </AccountFrame>
    );
  }
  return (
    <AccountFrame title={TITLE} view="ready" testId="membership-page" hideTitle>
      <div className={styles.page}>
        <p className={`pt-premium-kicker ${styles.kicker}`}>{HUB_COPY.kicker}</p>
        <PremiumSurface
          as="section"
          className={styles.surface}
          aria-label={TITLE}
        >
          <MembershipHome data={data} className={styles.owner} />
        </PremiumSurface>
      </div>
    </AccountFrame>
  );
}
