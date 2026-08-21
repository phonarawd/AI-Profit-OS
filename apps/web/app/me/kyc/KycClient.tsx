"use client";

import { KycFlow, type KycSubmitPayload } from "@aipo/ui/components/kyc";
import { T } from "@aipo/ui/copy/ko";
import { useEffect, useState } from "react";
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

  return (
    <AccountFrame title={T.kyc.pageTitle} view="ready" testId="kyc-page">
      <p className={styles.note} data-testid="kyc-status" data-kyc-status={status}>
        {statusLabel(status)}
      </p>
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
