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
import { readText } from "../../../lib/admin-truth";
import { AdminFetchNote, AdminTruth } from "../../../components/AdminTruth";

const TABS = ["kyc"] as const;
type ComplianceTab = (typeof TABS)[number];

const QUEUE_STATUSES = ["pending", "approved", "rejected"] as const;
type QueueStatus = (typeof QUEUE_STATUSES)[number];

const TAB_LABEL: Record<ComplianceTab, string> = {
  kyc: "본인 확인",
};

const STATUS_LABEL: Record<QueueStatus, string> = {
  pending: "대기",
  approved: "승인됨",
  rejected: "거절됨",
};

const DOC_TYPE_LABEL: Record<string, string> = {
  kr_id: "주민등록증",
  driver: "운전면허",
  passport: "여권",
};

const REJECT_REASON_MIN = 10;

type KycItem = {
  submissionId?: unknown;
  userId?: unknown;
  legalName?: unknown;
  phoneE164?: unknown;
  birthDate?: unknown;
  idDocType?: unknown;
  status?: unknown;
  rejectReason?: unknown;
  createdAt?: unknown;
  decidedAt?: unknown;
};

type DocPreview = {
  userId: string;
  kind: "id" | "selfie";
  objectUrl: string;
};

/**
 * Admin §9.1.1 / Money §42.3 — `/admin/compliance?tab=kyc`
 * Queue SoT = GET /api/v1/admin/compliance/kyc
 * Decide = POST .../approve | .../reject · Admin JWT+RBAC · 잔액 재계산 0
 */
// route lock: compliance?tab=kyc
function asQueue(data: unknown): KycItem[] | null {
  if (Array.isArray(data)) return data as KycItem[];
  if (data && typeof data === "object") {
    const items = (data as { items?: unknown }).items;
    if (Array.isArray(items)) return items as KycItem[];
  }
  return null;
}

function ComplianceContent() {
  const searchParams = useSearchParams();
  const tab = useMemo((): ComplianceTab => {
    const raw = searchParams.get("tab");
    if (raw && (TABS as readonly string[]).includes(raw)) {
      return raw as ComplianceTab;
    }
    return "kyc";
  }, [searchParams]);

  const queueStatus = useMemo((): QueueStatus => {
    const raw = searchParams.get("status");
    if (raw && (QUEUE_STATUSES as readonly string[]).includes(raw)) {
      return raw as QueueStatus;
    }
    return "pending";
  }, [searchParams]);

  const queueApi = `/api/v1/admin/compliance/kyc?status=${queueStatus}`;
  const approveApi = "/api/v1/admin/compliance/kyc/:userId/approve";
  const rejectApi = "/api/v1/admin/compliance/kyc/:userId/reject";
  const docUrlApi = "/api/v1/admin/compliance/kyc/:userId/doc-url";

  const [queue, setQueue] = useState<AdminResult<unknown> | null>(null);
  const [actionNote, setActionNote] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [preview, setPreview] = useState<DocPreview | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await adminGet<unknown>(queueApi);
      if (cancelled) return;
      setQueue(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [queueApi]);

  useEffect(() => {
    return () => {
      if (preview?.objectUrl) URL.revokeObjectURL(preview.objectUrl);
    };
  }, [preview]);

  async function refreshQueue() {
    setQueue(await adminGet<unknown>(queueApi));
  }

  async function decide(userId: string, decision: "approve" | "reject") {
    if (decision === "reject" && rejectReason.trim().length < REJECT_REASON_MIN) {
      setActionNote("거절 사유는 10자 이상이어야 합니다.");
      return;
    }
    if (
      !window.confirm(
        decision === "approve" ? "본인 확인을 승인할까요?" : "거절할까요?",
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
    if (res.ok) await refreshQueue();
  }

  async function openDoc(userId: string, kind: "id" | "selfie") {
    const res = await adminGet<Record<string, unknown>>(
      `/api/v1/admin/compliance/kyc/${userId}/doc-url?kind=${kind}`,
    );
    if (!res.ok) {
      setActionNote(
        res.failure.kind === "unauthorized"
          ? "운영 권한이 필요합니다"
          : "서류를 열 수 없습니다.",
      );
      return;
    }
    const signed = readText(res.data.signedUrl);
    if (!signed) {
      setActionNote("서류를 확인할 수 없습니다.");
      return;
    }
    try {
      const blobRes = await fetch(signed, { credentials: "omit" });
      if (!blobRes.ok) throw new Error("doc");
      const blob = await blobRes.blob();
      const objectUrl = URL.createObjectURL(blob);
      setPreview((prev) => {
        if (prev?.objectUrl) URL.revokeObjectURL(prev.objectUrl);
        return { userId, kind, objectUrl };
      });
    } catch {
      window.open(signed, "_blank", "noopener,noreferrer");
    }
  }

  const items = queue?.ok ? asQueue(queue.data) : null;

  return (
    <main
      className="p-6 text-lux-text"
      data-admin-compliance-tab={tab}
      data-testid="admin-compliance-page"
    >
      <h1 className="text-xl font-semibold">법적 확인·제재</h1>
      <nav
        className="mt-4 flex flex-wrap gap-2 text-sm"
        data-testid="compliance-tabs"
      >
        {TABS.map((t) => (
          <a
            key={t}
            href={`/admin/compliance?tab=${t}`}
            data-tab={t}
            className={
              tab === t
                ? "rounded px-2 py-1 bg-lux-elevated text-lux-accent"
                : "rounded px-2 py-1 text-lux-text-muted"
            }
          >
            {TAB_LABEL[t]}
          </a>
        ))}
      </nav>

      {tab === "kyc" ? (
        <section
          className="mt-6"
          data-testid="compliance-kyc-panel"
          data-queue-api={queueApi}
          data-approve-api={approveApi}
          data-reject-api={rejectApi}
          data-doc-url-api={docUrlApi}
          data-reject-reason-min={REJECT_REASON_MIN}
        >
          <p className="text-sm text-lux-text-muted">
            출금 본인 확인 심사 · 승인·거절은 서버 상태로만 · 잔액은 이 화면에서
            바꾸지 않습니다
          </p>
          <p className="mt-2 text-xs text-lux-text-muted">API: {queueApi}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            {QUEUE_STATUSES.map((status) => (
              <a
                key={status}
                href={`/admin/compliance?tab=kyc&status=${status}`}
                data-queue-status={status}
                className={
                  queueStatus === status
                    ? "rounded px-2 py-1 bg-lux-elevated"
                    : "rounded px-2 py-1 text-lux-text-muted"
                }
              >
                {STATUS_LABEL[status]}
              </a>
            ))}
          </div>
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
          ) : items && items.length === 0 ? (
            <p className="mt-3 text-sm text-lux-text-muted">
              {queueStatus === "pending"
                ? "대기 중인 본인 확인이 없습니다."
                : "해당 목록이 없습니다."}
            </p>
          ) : items ? (
            <ul className="mt-3 space-y-3">
              {items.map((item, idx) => {
                const userId = readText(item.userId);
                const docType = readText(item.idDocType);
                return (
                  <li
                    key={readText(item.submissionId) ?? userId ?? String(idx)}
                    className="rounded border border-lux-border p-3 text-sm"
                  >
                    <p>
                      이름 <AdminTruth value={readText(item.legalName)} />
                    </p>
                    <p>
                      회원 <AdminTruth value={userId} />
                    </p>
                    <p>
                      신청일 <AdminTruth value={readText(item.createdAt)} />
                    </p>
                    <p>
                      서류{" "}
                      <AdminTruth
                        value={
                          docType
                            ? (DOC_TYPE_LABEL[docType] ?? docType)
                            : null
                        }
                      />
                    </p>
                    <p>
                      연락처 <AdminTruth value={readText(item.phoneE164)} />
                    </p>
                    <p>
                      생년월일 <AdminTruth value={readText(item.birthDate)} />
                    </p>
                    <p>
                      상태{" "}
                      <AdminTruth
                        value={
                          readText(item.status)
                            ? STATUS_LABEL[
                                readText(item.status) as QueueStatus
                              ] ?? readText(item.status)
                            : null
                        }
                      />
                    </p>
                    {readText(item.rejectReason) ? (
                      <p>
                        거절 사유{" "}
                        <AdminTruth value={readText(item.rejectReason)} />
                      </p>
                    ) : null}
                    {userId ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-lux-text-muted"
                          onClick={() => void openDoc(userId, "id")}
                        >
                          신분증 보기
                        </button>
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-lux-text-muted"
                          onClick={() => void openDoc(userId, "selfie")}
                        >
                          셀피 보기
                        </button>
                        {queueStatus === "pending" ? (
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
                    {preview && preview.userId === userId ? (
                      // blob URL only — signed URL / r2Key 화면 노출 0
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt="본인 확인 서류"
                        src={preview.objectUrl}
                        className="mt-3 max-h-64 rounded border border-lux-border"
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <AdminTruth value={null} />
          )}
          {actionNote ? (
            <p className="mt-2 text-sm text-lux-text-muted">{actionNote}</p>
          ) : null}
        </section>
      ) : null}
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
