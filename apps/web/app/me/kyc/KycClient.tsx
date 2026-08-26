"use client";

import { KycFlow, type KycSubmitPayload } from "@aipo/ui/components/kyc";
import { T } from "@aipo/ui/copy/ko";
import { useEffect, useState } from "react";
import { PremiumStatus } from "../../../components/putduk-premium";
import {
  AccountAuthActions,
  AccountFrame,
  type AccountView,
} from "../AccountFrame";
import styles from "../account.module.css";

type KycStatus = "none" | "pending" | "approved" | "rejected";

type KycStatusResponse = {
  kycStatus?: KycStatus;
  rejectReason?: string;
};

function sessionToken(): string | null {
  return null;
}

function statusLabel(status: KycStatus): string {
  if (status === "pending") return "본인 확인을 살펴보는 중이에요.";
  if (status === "approved") return "출금에 필요한 본인 확인이 되어 있어요.";
  if (status === "rejected") return "본인 확인이 반려되었어요.";
  return "출금하려면 본인 확인이 필요해요.";
}

function statusVisual(status: KycStatus): {
  label: string;
  tone: "live" | "success" | "warning" | "danger";
  live?: boolean;
} {
  if (status === "pending") return { label: "확인 중", tone: "live", live: true };
  if (status === "approved") return { label: "본인 확인 완료", tone: "success" };
  if (status === "rejected") return { label: "다시 확인 필요", tone: "danger" };
  return { label: "본인 확인 필요", tone: "warning" };
}

export function KycClient() {
  const [view, setView] = useState<AccountView>("loading");
  const [status, setStatus] = useState<KycStatus | null>(null);
  const [rejectReason, setRejectReason] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      try {
        const headers: Record<string, string> = { Accept: "application/json" };
        const token = sessionToken();
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch("/api/v1/compliance/kyc/status", {
          credentials: "include",
          cache: "no-store",
          headers,
          signal: ac.signal,
        });
        if (ac.signal.aborted) return;
        if (res.status === 401 || res.status === 403) {
          setStatus(null);
          setView("unauthorized");
          return;
        }
        if (!res.ok) {
          setStatus(null);
          setView("unavailable");
          return;
        }
        const json = (await res.json()) as KycStatusResponse;
        const next = json.kycStatus;
        if (
          next !== "none" &&
          next !== "pending" &&
          next !== "approved" &&
          next !== "rejected"
        ) {
          setStatus(null);
          setView("unavailable");
          return;
        }
        setStatus(next);
        setRejectReason(
          typeof json.rejectReason === "string" && json.rejectReason.trim()
            ? json.rejectReason
            : null,
        );
        setView("ready");
      } catch (err) {
        if (ac.signal.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setStatus(null);
        setView("unavailable");
      }
    })();
    return () => ac.abort();
  }, []);

  if (view === "loading") {
    return (
      <AccountFrame title={T.kyc.pageTitle} view="loading" testId="kyc-page">
        <p className={styles.lead}>불러오는 중…</p>
      </AccountFrame>
    );
  }

  if (view === "unauthorized") {
    return (
      <AccountFrame title={T.kyc.pageTitle} view="unauthorized" testId="kyc-page">
        <p className={styles.lead}>로그인하면 본인 확인을 볼 수 있어요.</p>
        <AccountAuthActions />
      </AccountFrame>
    );
  }

  if (view === "unavailable" || status == null) {
    return (
      <AccountFrame title={T.kyc.pageTitle} view="unavailable" testId="kyc-page">
        <p className={styles.err}>본인 확인 상태를 확인할 수 없음</p>
      </AccountFrame>
    );
  }

  const visual = statusVisual(status);

  return (
    <AccountFrame title={T.kyc.pageTitle} view="ready" testId="kyc-page">
      <section className={styles.statusPanel} aria-labelledby="kyc-current-status">
        <div className={styles.statusPanelTop}>
          <div>
            <p className={styles.statusPanelKicker}>현재 상태</p>
            <h2 id="kyc-current-status" className={styles.statusPanelTitle}>
              {statusLabel(status)}
            </h2>
          </div>
          <PremiumStatus label={visual.label} tone={visual.tone} live={visual.live} />
        </div>
        <p className={styles.statusPanelBody}>
          {status === "approved"
            ? "추가로 제출할 내용이 없어요. 필요한 기능을 그대로 이용하면 됩니다."
            : status === "pending"
              ? "제출한 내용을 확인하고 있어요. 상태가 바뀌면 이 화면에서 확인할 수 있습니다."
              : status === "rejected"
                ? "아래 안내를 확인하고 필요한 내용을 다시 제출해 주세요."
                : "아래 정보를 차례대로 입력하면 본인 확인을 시작할 수 있어요."}
        </p>
      </section>
      {status === "rejected" && rejectReason ? (
        <p className={styles.err}>{rejectReason}</p>
      ) : null}
      {status === "approved" ? null : (
        <div className={styles.surface}>
          <KycFlow
            onSubmit={async (payload: KycSubmitPayload) => {
              const fd = new FormData();
              fd.set("legalName", payload.legalName);
              fd.set("phoneE164", payload.phone);
              fd.set("birthDate", payload.birthDate);
              fd.set("idDocType", payload.idDocType);
              if (payload.idDocFile) {
                fd.set("idDoc", payload.idDocFile, payload.idDocFile.name);
              }
              if (payload.selfieFile) {
                fd.set("selfie", payload.selfieFile, payload.selfieFile.name);
              }
              const res = await fetch("/api/v1/compliance/kyc/submit", {
                method: "POST",
                credentials: "include",
                body: fd,
              });
              if (!res.ok) {
                throw new Error(`kyc_submit_${res.status}`);
              }
              setStatus("pending");
            }}
          />
        </div>
      )}
    </AccountFrame>
  );
}
