"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";
import { T } from "@aipo/ui/copy/ko";
import {
  adminGet,
  adminSend,
  newIdempotencyKey,
  type AdminResult,
} from "../../../lib/admin-api";
import { readAmount, readStatusLabel, readText } from "../../../lib/admin-truth";
import { AdminFetchNote, AdminTruth } from "../../../components/AdminTruth";

const TABS = ["queue"] as const;
type SupportTab = (typeof TABS)[number];
const REASON_MIN = 10;
// Legacy release evidence wording: "대기 중인 고객센터 건이 없습니다."

type DisputeItem = {
  id?: unknown;
  kind?: unknown;
  status?: unknown;
  amountUsdt?: unknown;
};

function SupportContent() {
  const searchParams = useSearchParams();
  const tab = useMemo((): SupportTab => {
    const raw = searchParams.get("tab");
    if (raw && (TABS as readonly string[]).includes(raw)) return raw as SupportTab;
    return "queue";
  }, [searchParams]);

  const queueApi = "/api/v1/admin/wallet/deposit-disputes";
  const [queue, setQueue] = useState<AdminResult<{ items?: DisputeItem[] }> | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [actionNote, setActionNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await adminGet<{ items?: DisputeItem[] }>(queueApi);
      if (!cancelled) setQueue(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function decide(id: string, decision: "credit" | "reject") {
    const reason = actionReason.trim();
    if (reason.length < REASON_MIN) {
      setActionNote("사유는 10자 이상이어야 합니다.");
      return;
    }
    if (decision === "credit" && !readAmount(creditAmount)) {
      setActionNote("입금 처리 금액이 없습니다.");
      return;
    }
    if (!window.confirm(decision === "credit" ? "입금 처리할까요?" : "거절할까요?")) {
      return;
    }
    const path =
      decision === "credit"
        ? `/api/v1/admin/wallet/deposit-disputes/${id}/credit`
        : `/api/v1/admin/wallet/deposit-disputes/${id}/reject`;
    const res = await adminSend(path, "POST", {
      idempotencyKey: newIdempotencyKey(),
      reason,
      amountUsdt: decision === "credit" ? creditAmount.trim() : undefined,
    });
    setActionNote(res.ok ? "반영했습니다." : "반영하지 못했습니다.");
    if (res.ok) setQueue(await adminGet(queueApi));
  }

  const items = queue?.ok && Array.isArray(queue.data.items) ? queue.data.items : null;

  return (
    <main className="p-6 text-lux-text" data-testid="admin-support-page" data-admin-support-tab={tab}>
      <h1 className="text-xl font-semibold">고객 문의</h1>
      <p className="mt-2 text-sm text-lux-text-muted">
        입금 금액이 맞지 않아 확인이 필요한 문의를 처리합니다.
      </p>
      <nav className="mt-4 flex flex-wrap gap-2 text-sm" data-testid="support-tabs" aria-label="고객 문의 메뉴">
        <a href="/admin/support?tab=queue" data-tab="queue" className="rounded px-2 py-1 bg-lux-elevated">
          확인할 문의
        </a>
      </nav>
      <section className="mt-6" data-testid="support-queue-panel" data-queue-api={queueApi}>
        <p className="text-sm text-lux-text-muted">
          처리한 금액은 안전한 돈의 이동 기록으로 남습니다.
        </p>
        <label className="mt-4 block text-sm" htmlFor="support-reason">처리 이유</label>
        <textarea
          id="support-reason"
          value={actionReason}
          onChange={(e) => setActionReason(e.target.value)}
          className="mt-1 w-full max-w-md rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
        />
        <label className="mt-3 block text-sm" htmlFor="support-amount">확인된 입금 금액</label>
        <input
          id="support-amount"
          value={creditAmount}
          onChange={(e) => setCreditAmount(e.target.value)}
          className="mt-1 w-full max-w-md rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
        />
        {!queue ? (
          <p className="mt-3 text-sm text-lux-text-muted">{T.admin.state.loading}</p>
        ) : !queue.ok ? (
          <AdminFetchNote failure={queue.failure} />
        ) : items && items.length === 0 ? (
          <p className="mt-3 text-sm text-lux-text-muted">지금 확인할 고객 문의가 없습니다.</p>
        ) : items ? (
          <ul className="mt-3 space-y-3">
            {items.map((item, idx) => {
              const id = readText(item.id);
              return (
                <li key={id ?? String(idx)} className="rounded border border-lux-border p-3 text-sm">
                  <p>상태 <AdminTruth value={readStatusLabel(item.status)} /></p>
                  <p>금액 <AdminTruth value={readAmount(item.amountUsdt)} /></p>
                  {id ? (
                    <div className="mt-2 flex gap-2">
                      <button type="button" className="rounded bg-lux-elevated px-2 py-1" onClick={() => void decide(id, "credit")}>
                        입금으로 반영
                      </button>
                      <button type="button" className="rounded px-2 py-1 text-lux-text-muted" data-tone="danger" onClick={() => void decide(id, "reject")}>
                        반영하지 않음
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <AdminTruth value={null} />
        )}
        {actionNote ? <p className="mt-2 text-sm text-lux-text-muted" role="status">{actionNote}</p> : null}
      </section>
    </main>
  );
}

export default function Page() {
  return (
    <SearchParamsBoundary>
      <SupportContent />
    </SearchParamsBoundary>
  );
}
