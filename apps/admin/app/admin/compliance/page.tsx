"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";
import {
  adminGet,
  adminSend,
  newIdempotencyKey,
  type AdminResult,
} from "../../../lib/admin-api";
import {
  asRecordList,
  readText,
} from "../../../lib/admin-truth";
import { AdminFetchNote, AdminTruth } from "../../../components/AdminTruth";

const TABS = ["kyc"] as const;
type ComplianceTab = (typeof TABS)[number];

const QUEUE_STATUSES = ["pending", "approved", "rejected"] as const;
type QueueStatus = (typeof QUEUE_STATUSES)[number];

const STATUS_LABEL: Record<QueueStatus, string> = {
  pending: "대기",
  approved: "승인",
  rejected: "거절",
};

const DOC_LABEL: Record<string, string> = {
  kr_id: "주민등록증",
  driver: "운전면허",
  passport: "여권",
};

/**
 * Admin §9.1.1 / Money §42 — `/admin/compliance?tab=kyc`
 * Queue SoT = GET /api/v1/admin/compliance/kyc
 * Decide = POST .../approve | .../reject · 서버 전이만 · 잔액 조작 0
 */
function ComplianceContent() {
  const searchParams = useSearchParams();
  const tab = useMemo((): ComplianceTab => {
    const raw = searchParams.get("tab");
    if (raw && (TABS as readonly string[]).includes(raw)) {
      return raw as ComplianceTab;
    }
    return "kyc";
  }, [searchParams]);

  const status = useMemo((): QueueStatus => {
    const raw = searchParams.get("status");
    if (raw && (QUEUE_STATUSES as readonly string[]).includes(raw)) {
      return raw as QueueStatus;
    }
    return "pending";
  }, [searchParams]);

  const queueApi = `/api/v1/admin/compliance/kyc?status=${status}`;
  const [queue, setQueue] = useState<AdminResult<unknown> | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionNote, setActionNote] = useState<string | null>(null);
  const [docNote, setDocNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await adminGet<unknown>(queueApi);
      if (cancelled) return;
      setQueue(res);
    })();
    return () => {
      cancelled = true;
    };
  }, [queueApi]);

  async function reload() {
    setQueue(await adminGet<unknown>(queueApi));
  }

  async function decide(userId: string, decision: "approve" | "reject") {
    if (decision === "reject" && rejectReason.trim().length < 10) {
      setActionNote("거절 사유는 10자 이상이어야 합니다.");
      return;
    }
    if (
      !window.confirm(
        decision === "approve" ? "신원 확인을 승인할까요?" : "거절할까요?",
      )
    ) {
      return;
    }
    const path =
      decision === "approve"
        ? `/api/v1/admin/compliance/kyc/${userId}/approve`
        : `/api/v1/admin/compliance/kyc/${userId}/reject`;
    const res = await adminSend(path, "POST", {
      idempotencyKey: newIdempotencyKey(),
      reason: decision === "reject" ? rejectReason.trim() : undefined,
    });
    setActionNote(res.ok ? "반영했습니다." : "반영하지 못했습니다.");
    if (res.ok) await reload();
  }

  async function openDoc(userId: string, kind: "id" | "selfie") {
    setDocNote(null);
    const res = await adminGet<{
      signedUrl?: unknown;
      publicAccess?: unknown;
    }>(`/api/v1/admin/compliance/kyc/${userId}/doc-url?kind=${kind}`);
    if (!res.ok) {
      setDocNote("서류를 열 수 없습니다.");
      return;
    }
    const url = readText(res.data.signedUrl);
    if (!url || res.data.publicAccess === true) {
      setDocNote("확인할 수 없음");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const items = queue?.ok ? asRecordList(queue.data) : null;

  return (
    <main
      className="p-6 text-lux-text"
      data-testid="admin-compliance"
      data-admin-compliance-tab={tab}
    >
      <h1 className="text-xl font-semibold">법적 확인·제재</h1>
      <p className="mt-2 text-sm text-lux-text-muted">
        서버에 있는 신원 확인만 봅니다. 없는 상태는 승인으로 채우지 않습니다.
      </p>

      <nav
        className="mt-4 flex flex-wrap gap-2 text-sm"
        data-testid="compliance-tabs"
      >
        <a
          href="/admin/compliance?tab=kyc"
          data-tab="kyc"
          className="rounded px-2 py-1 bg-lux-elevated text-lux-accent"
        >
          신원 확인
        </a>
      </nav>

      <section
        className="mt-6"
        data-testid="compliance-kyc-panel"
        data-queue-api="/api/v1/admin/compliance/kyc"
        data-approve-api="/api/v1/admin/compliance/kyc/:userId/approve"
        data-reject-api="/api/v1/admin/compliance/kyc/:userId/reject"
        data-doc-api="/api/v1/admin/compliance/kyc/:userId/doc-url"
        data-forbid="fake-kyc-truth"
      >
        <nav className="flex flex-wrap gap-2 text-sm" aria-label="신원 확인 상태">
          {QUEUE_STATUSES.map((s) => (
            <a
              key={s}
              href={`/admin/compliance?tab=kyc&status=${s}`}
              data-status={s}
              className={
                status === s
                  ? "rounded px-2 py-1 bg-lux-elevated text-lux-accent"
                  : "rounded px-2 py-1 text-lux-text-muted"
              }
            >
              {STATUS_LABEL[s]}
            </a>
          ))}
        </nav>

        <label className="mt-4 block text-sm" htmlFor="kyc-reject-reason">
          거절 사유
        </label>
        <textarea
          id="kyc-reject-reason"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          className="mt-1 w-full max-w-md rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
        />

        {!queue ? (
          <p className="mt-3 text-sm text-lux-text-muted">불러오는 중</p>
        ) : !queue.ok ? (
          <AdminFetchNote failure={queue.failure} />
        ) : items == null ? (
          <AdminTruth value={null} testId="compliance-kyc-list" />
        ) : items.length === 0 ? (
          <p className="mt-3 text-sm text-lux-text-muted" data-testid="compliance-kyc-empty">
            해당 상태 건이 없습니다.
          </p>
        ) : (
          <ul className="mt-3 space-y-3" data-testid="compliance-kyc-list">
            {items.map((item, idx) => {
              const userId = readText(item.userId);
              const docType = readText(item.idDocType);
              return (
                <li
                  key={userId ?? String(idx)}
                  className="rounded border border-lux-border p-3 text-sm"
                >
                  <p>
                    이름 <AdminTruth value={readText(item.legalName)} />
                  </p>
                  <p>
                    전화 <AdminTruth value={readText(item.phoneE164)} />
                  </p>
                  <p>
                    생년월일 <AdminTruth value={readText(item.birthDate)} />
                  </p>
                  <p>
                    서류{" "}
                    <AdminTruth
                      value={docType ? (DOC_LABEL[docType] ?? docType) : null}
                    />
                  </p>
                  <p>
                    상태{" "}
                    <AdminTruth
                      value={
                        readText(item.status)
                          ? STATUS_LABEL[readText(item.status) as QueueStatus] ??
                            readText(item.status)
                          : null
                      }
                    />
                  </p>
                  {userId ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <a
                        href={`/admin/users/${userId}`}
                        className="rounded px-2 py-1 text-lux-text-muted"
                      >
                        회원 보기
                      </a>
                      <button
                        type="button"
                        className="rounded px-2 py-1 text-lux-text-muted"
                        onClick={() => void openDoc(userId, "id")}
                      >
                        신분증
                      </button>
                      <button
                        type="button"
                        className="rounded px-2 py-1 text-lux-text-muted"
                        onClick={() => void openDoc(userId, "selfie")}
                      >
                        셀카
                      </button>
                      {status === "pending" ? (
                        <>
                          <button
                            type="button"
                            className="rounded bg-lux-elevated px-2 py-1"
                            onClick={() => void decide(userId, "approve")}
                          >
                            승인
                          </button>
                          <button
                            type="button"
                            className="rounded px-2 py-1 text-lux-text-muted"
                            onClick={() => void decide(userId, "reject")}
                          >
                            거절
                          </button>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {actionNote ? (
          <p className="mt-2 text-sm text-lux-text-muted">{actionNote}</p>
        ) : null}
        {docNote ? (
          <p className="mt-2 text-sm text-lux-text-muted">{docNote}</p>
        ) : null}
      </section>
    </main>
  );
}

export default function Page() {
  return (
    <SearchParamsBoundary>
      <ComplianceContent />
    </SearchParamsBoundary>
  );
}
