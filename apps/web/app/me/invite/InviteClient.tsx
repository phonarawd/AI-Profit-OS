"use client";

import { InviteHome } from "@aipo/ui/components/invite";
import { T } from "@aipo/ui/copy/ko";
import { useEffect, useState } from "react";
import {
  AccountAuthActions,
  AccountFrame,
  type AccountView,
} from "../AccountFrame";
import styles from "../account.module.css";

type ReferralEdge = {
  code?: string;
  status?: string;
};

type ReferralMe = {
  enabled?: boolean;
  rewardsEnabled?: boolean;
  inviteCountUnlimited?: boolean;
  edges?: ReferralEdge[];
  myBinding?: { code?: string; status?: string } | null;
  poolWaitToast?: string;
};

function sessionToken(): string | null {
  return null;
}

function isAuthFailure(status: number): boolean {
  return status === 401 || status === 403;
}

export function InviteClient() {
  const [view, setView] = useState<AccountView>("loading");
  const [data, setData] = useState<ReferralMe | null>(null);
  const [bindCode, setBindCode] = useState("");
  const [bindView, setBindView] = useState<
    "idle" | "saving" | "success" | "unavailable"
  >("idle");

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      try {
        const headers: Record<string, string> = { Accept: "application/json" };
        const token = sessionToken();
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch("/api/v1/referral/me", {
          credentials: "include",
          cache: "no-store",
          headers,
          signal: ac.signal,
        });
        if (ac.signal.aborted) return;
        if (isAuthFailure(res.status)) {
          setData(null);
          setView("unauthorized");
          return;
        }
        if (!res.ok) {
          setData(null);
          setView("unavailable");
          return;
        }
        const json = (await res.json()) as ReferralMe;
        if (ac.signal.aborted) return;
        setData(json);
        setView(json.enabled === false ? "disabled" : "ready");
      } catch (err) {
        if (ac.signal.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setData(null);
        setView("unavailable");
      }
    })();
    return () => ac.abort();
  }, []);

  async function bind() {
    const code = bindCode.trim();
    if (!code) return;
    setBindView("saving");
    try {
      const res = await fetch("/api/v1/referral/bind", {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ referralCode: code }),
      });
      if (res.ok) {
        setBindView("success");
        return;
      }
      setBindView("unavailable");
    } catch {
      setBindView("unavailable");
    }
  }

  if (view === "loading") {
    return (
      <AccountFrame title={T.invite.title} view="loading" testId="invite-home-page">
        <p className={styles.lead}>불러오는 중…</p>
      </AccountFrame>
    );
  }

  if (view === "unauthorized") {
    return (
      <AccountFrame
        title={T.invite.title}
        view="unauthorized"
        testId="invite-home-page"
      >
        <p className={styles.lead}>로그인하면 초대를 볼 수 있어요.</p>
        <AccountAuthActions />
      </AccountFrame>
    );
  }

  if (view === "unavailable" || data == null) {
    return (
      <AccountFrame
        title={T.invite.title}
        view="unavailable"
        testId="invite-home-page"
      >
        <p className={styles.err}>초대 현황을 확인할 수 없음</p>
      </AccountFrame>
    );
  }

  if (view === "disabled") {
    return (
      <AccountFrame
        title={T.invite.title}
        view="disabled"
        testId="invite-home-page"
      >
        <p className={styles.note}>지금은 초대를 받을 수 없음</p>
      </AccountFrame>
    );
  }

  const edges = Array.isArray(data.edges) ? data.edges : null;
  const ownCode = edges?.map((e) => e.code).find((c) => typeof c === "string" && c.trim());
  const joined = edges ? edges.length : undefined;

  return (
    <AccountFrame
        title={T.invite.title}
        view="ready"
        testId="invite-home-page"
        hideTitle
      >
      <div className={styles.surface}>
        <InviteHome
          inviteCode={ownCode ?? ""}
          shareUrl=""
          codeUnavailable={!ownCode}
          stats={
            edges
              ? {
                  joined,
                  bonusProfitLabel:
                    data.rewardsEnabled === true ? undefined : "확인할 수 없음",
                }
              : undefined
          }
        />
      </div>
      <h2 className={styles.sectionTitle}>초대 코드 연결</h2>
      {data.myBinding?.code ? (
        <p className={styles.note}>이미 연결된 초대가 있어요.</p>
      ) : (
        <div className={styles.field}>
          <label htmlFor="invite-bind-code">{T.user.placeholder.inviteCode}</label>
          <input
            id="invite-bind-code"
            data-testid="invite-bind-code"
            value={bindCode}
            onChange={(e) => setBindCode(e.target.value)}
            autoComplete="off"
          />
          <div className={styles.actions}>
            <button
              type="button"
              data-testid="invite-bind-submit"
              onClick={() => void bind()}
              disabled={bindView === "saving"}
            >
              연결
            </button>
          </div>
          {bindView === "success" ? (
            <p className={styles.note} role="status">
              초대 코드를 연결했어요.
            </p>
          ) : null}
          {bindView === "unavailable" ? (
            <p className={styles.err} role="status">
              지금은 연결할 수 없음
            </p>
          ) : null}
        </div>
      )}
    </AccountFrame>
  );
}
