"use client";

import { InviteHome } from "@aipo/ui/components/invite";
import { T } from "@aipo/ui/copy/ko";
import { useEffect, useRef, useState } from "react";
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
import styles from "./invite-premium.module.css";

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

type BindView =
  | "idle"
  | "submitting"
  | "success"
  | "denied"
  | "unauthorized"
  | "unavailable";

function sessionToken(): string | null {
  return null;
}

function isAuthFailure(status: number): boolean {
  return status === 401 || status === 403;
}

function ownReferralCode(data: ReferralMe): string | null {
  if (!Array.isArray(data.edges)) return null;
  const found = data.edges
    .map((edge) => edge.code)
    .find((code) => typeof code === "string" && code.trim());
  return typeof found === "string" ? found.trim() : null;
}

export function InviteClient() {
  const [view, setView] = useState<AccountView>("loading");
  const [data, setData] = useState<ReferralMe | null>(null);
  const [bindCode, setBindCode] = useState("");
  const [bindView, setBindView] = useState<BindView>("idle");
  const bindInFlightRef = useRef(false);

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
        let json: ReferralMe;
        try {
          json = (await res.json()) as ReferralMe;
        } catch {
          if (ac.signal.aborted) return;
          setData(null);
          setView("unavailable");
          return;
        }
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

  function bind() {
    const code = bindCode.trim();
    if (!code) return;
    if (view === "disabled" || data?.enabled === false) return;
    if (data?.myBinding != null) return;
    if (bindInFlightRef.current) return;
    bindInFlightRef.current = true;
    setBindView("submitting");
    void (async () => {
      try {
        const res = await fetch("/api/v1/referral/bind", {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ referralCode: code }),
        });
        if (res.ok) {
          setBindView("success");
          return;
        }
        if (res.status === 401) {
          setBindView("unauthorized");
        } else if (
          res.status === 400 ||
          res.status === 409 ||
          res.status === 403
        ) {
          setBindView("denied");
        } else {
          setBindView("unavailable");
        }
        bindInFlightRef.current = false;
      } catch {
        setBindView("unavailable");
        bindInFlightRef.current = false;
      }
    })();
  }

  if (view === "loading") {
    return (
      <AccountFrame title={T.invite.title} view="loading" testId="invite-home-page">
        <PremiumSurface
          as="section"
          className={styles.surface}
          aria-busy="true"
          aria-live="polite"
        >
          <p className={`pt-premium-description ${styles.stateCopy}`}>
            {HUB_COPY.loadingEllipsis}
          </p>
        </PremiumSurface>
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
        <PremiumSurface as="section" className={styles.surface}>
          <PremiumEmptyState
            title={HUB_COPY.loginTitle}
            description="로그인하면 초대를 볼 수 있어요."
            action={<AccountAuthActions />}
          />
        </PremiumSurface>
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
        <PremiumSurface as="section" className={styles.surface}>
          <PremiumEmptyState
            title={HUB_COPY.unavailableTitle}
            description="초대 현황을 확인할 수 없음"
          />
        </PremiumSurface>
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
        <PremiumSurface as="section" className={styles.surface}>
          <PremiumEmptyState
            title="지금은 초대를 받을 수 없음"
            description="초대 프로그램이 꺼져 있어 코드를 연결할 수 없어요."
          />
        </PremiumSurface>
      </AccountFrame>
    );
  }

  const ownCode = ownReferralCode(data);
  const alreadyBound = data.myBinding != null;
  const boundCode =
    typeof data.myBinding?.code === "string" && data.myBinding.code.trim()
      ? data.myBinding.code.trim()
      : null;
  const bindBusy = bindView === "submitting";

  return (
    <AccountFrame
      title={T.invite.title}
      view="ready"
      testId="invite-home-page"
      hideTitle
    >
      <div className={styles.page}>
        <p className={`pt-premium-kicker ${styles.kicker}`}>{HUB_COPY.kicker}</p>
        <PremiumSurface
          as="section"
          className={styles.surface}
          aria-label={T.invite.title}
        >
          <InviteHome
            className={styles.owner}
            inviteCode={ownCode ?? ""}
            shareUrl=""
            codeUnavailable={!ownCode}
          />
        </PremiumSurface>
        <PremiumCard
          className={styles.bindCard}
          data-testid="invite-bind-panel"
          data-bind-view={bindView}
          data-already-bound={alreadyBound ? "true" : "false"}
        >
          <h2 className={styles.bindTitle}>초대 코드 연결</h2>
      {alreadyBound ? (
        <>
          <p className={styles.bindNote}>이미 연결된 초대가 있어요.</p>
          {boundCode ? (
            <p className={styles.bindLead}>연결된 코드: {boundCode}</p>
          ) : null}
        </>
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
              onClick={bind}
              disabled={bindBusy}
            >{bindBusy ? "연결하는 중" : "연결"}</button>
          </div>
          {bindView === "success" ? (
            <p
              className={styles.bindStatus}
              data-testid="invite-bind-status"
              data-tone="success"
              role="status"
            >
              초대 코드를 연결했어요.
            </p>
          ) : null}
          {bindView === "denied" ? (
            <p
              className={styles.bindStatus}
              data-testid="invite-bind-status"
              data-tone="danger"
              role="status"
            >
              이 코드는 연결할 수 없어요.
            </p>
          ) : null}
          {bindView === "unauthorized" ? (
            <p
              className={styles.bindStatus}
              data-testid="invite-bind-status"
              data-tone="warning"
              role="status"
            >
              다시 로그인해 주세요.
            </p>
          ) : null}
          {bindView === "unavailable" ? (
            <p
              className={styles.bindStatus}
              data-testid="invite-bind-status"
              data-tone="warning"
              role="status"
            >
              지금은 연결할 수 없음
            </p>
          ) : null}
        </div>
      )}
        </PremiumCard>
      </div>
    </AccountFrame>
  );
}
