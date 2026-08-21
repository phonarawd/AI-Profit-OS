"use client";

import { useEffect, useState } from "react";
import {
  MembershipHome,
  type MembershipMeModel,
} from "@aipo/ui/components/membership";
import {
  AccountAuthActions,
  AccountFrame,
  type AccountView,
} from "../AccountFrame";
import styles from "../account.module.css";

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
        const json = (await res.json()) as MembershipMeModel;
        if (ac.signal.aborted) return;
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
      <AccountFrame title="멤버십" view="loading" testId="membership-page">
        <p className={styles.lead}>불러오는 중…</p>
      </AccountFrame>
    );
  }
  if (view === "unauthorized") {
    return (
      <AccountFrame title="멤버십" view="unauthorized" testId="membership-page">
        <p className={styles.lead}>로그인하면 멤버십을 볼 수 있어요.</p>
        <AccountAuthActions />
      </AccountFrame>
    );
  }
  if (view === "unavailable" || data == null) {
    return (
      <AccountFrame title="멤버십" view="unavailable" testId="membership-page">
        <p className={styles.err}>멤버십을 확인할 수 없음</p>
      </AccountFrame>
    );
  }
  return (
    <AccountFrame title="멤버십" view="ready" testId="membership-page" hideTitle>
      <div className={styles.surface}>
        <MembershipHome data={data} />
      </div>
    </AccountFrame>
  );
}
