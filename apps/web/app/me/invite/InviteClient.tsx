"use client";

import {
  InviteHome,
  classifyReferralHttp,
  parseReferralMe,
  type ReferralMeReady,
} from "@aipo/ui/components/invite";
import { parseUserUxPrefs, type UxToneBand } from "@aipo/ui/components/settings/ux-prefs-state";
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

export function InviteClient() {
  const [view, setView] = useState<AccountView>("loading");
  const [data, setData] = useState<ReferralMeReady | null>(null);
  const [bindCode, setBindCode] = useState("");
  const [bindView, setBindView] = useState<
    "idle" | "saving" | "success" | "unavailable"
  >("idle");
  const [toneBand, setToneBand] = useState<UxToneBand | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      try {
        const headers: Record<string, string> = { Accept: "application/json" };
        const token = sessionToken();
        if (token) headers.Authorization = `Bearer ${token}`;
        const uxRes = await fetch("/api/v1/me/ux-prefs", {
          credentials: "include",
          cache: "no-store",
          headers,
          signal: ac.signal,
        }).catch(() => null);
        if (uxRes && uxRes.ok) {
          const uxParsed = parseUserUxPrefs(await uxRes.json().catch(() => null));
          if (uxParsed) setToneBand(uxParsed.toneBand);
        }
        const res = await fetch("/api/v1/referral/me", {
          credentials: "include",
          cache: "no-store",
          headers,
          signal: ac.signal,
        });
        if (ac.signal.aborted) return;
        if (!res.ok) {
          setData(null);
          setView(classifyReferralHttp(res.status));
          return;
        }
        const json = await res.json().catch(() => null);
        if (ac.signal.aborted) return;
        const parsed = parseReferralMe(json);
        if (!parsed) {
          setData(null);
          setView("unavailable");
          return;
        }
        if (parsed.view === "disabled") {
          setData(null);
          setView("disabled");
          return;
        }
        setData(parsed.data);
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

  if (view === "unavailable" || (view === "ready" && data == null)) {
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

  if (view === "disabled" || data == null) {
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

  return (
    <AccountFrame
        title={T.invite.title}
        view="ready"
        testId="invite-home-page"
        hideTitle
      >
      <div className={styles.surface}>
        <InviteHome
          toneBand={toneBand}
          inviteCode={data.referralCode}
          shareUrl=""
          codeUnavailable={false}
          stats={{
            joined: data.joined,
            bonusProfitLabel:
              data.rewardsEnabled === true ? undefined : "확인할 수 없음",
          }}
        />
      </div>
      <h2 className={styles.sectionTitle}>초대 코드 연결</h2>
      {data.myBindingCode ? (
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
