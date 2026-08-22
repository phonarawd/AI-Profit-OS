"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";
import {
  adminGet,
  adminSend,
  newIdempotencyKey,
  type AdminResult,
} from "../../../lib/admin-api";
import {
  asRecordList,
  isUuid,
  readAmount,
  readText,
} from "../../../lib/admin-truth";
import { AdminFetchNote, AdminTruth } from "../../../components/AdminTruth";

const TABS = ["queue"] as const;
type SupportTab = (typeof TABS)[number];

const KIND_LABEL: Record<string, string> = {
  wrong_chain: "다른 네트워크",
  mis_deposit: "오입금",
};

const STATUS_LABEL: Record<string, string> = {
  open: "대기",
  credited: "입금 처리",
  rejected: "거절",
};

/**
 * Admin §9.1.1 — `/admin/support?tab=queue`
 * CS queue SoT = existing deposit_disputes + support_tickets (wallet owner)
 * GET /api/v1/admin/wallet/deposit-disputes
 * Decide = POST .../credit | .../reject · 서버 전이만 · 잔액 UPDATE 0
 * Ops 안내 = existing OpsInboxAdminController · 회원 단위만
 */

function SupportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = useMemo((): SupportTab => {
    const raw = searchParams.get("tab");
    if (raw && (TABS as readonly string[]).includes(raw)) {
      return raw as SupportTab;
    }
    return "queue";
  }, [searchParams]);

  const queueApi = "/api/v1/admin/wallet/deposit-disputes";
  const [queue, setQueue] = useState<AdminResult<unknown> | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [actionNote, setActionNote] = useState<string | null>(null);
  const [userDraft, setUserDraft] = useState("");
  const [userInvalid, setUserInvalid] = useState(false);
  const [opsUserId, setOpsUserId] = useState("");
  const [opsTitle, setOpsTitle] = useState("");
  const [opsBody, setOpsBody] = useState("");
  const [opsList, setOpsList] = useState<AdminResult<unknown> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await adminGet<unknown>(queueApi);
      if (!cancelled) setQueue(res);
    })();
    return () => {
      cancelled = true;
    };
  }, [queueApi]);

  async function reload() {
    setQueue(await adminGet<unknown>(queueApi));
  }

  async function decide(
    event: { preventDefault(): void },
    id: string,
    decision: "credit" | "reject",
  ) {
    event.preventDefault();
    if (actionReason.trim().length < 10) {
      setActionNote("사유는 10자 이상이어야 합니다.");
      return;
    }
    if (decision === "credit" && !readAmount(creditAmount)) {
      setActionNote("넣을 금액을 확인할 수 없습니다.");
      return;
    }
    if (
      !window.confirm(
        decision === "credit" ? "입금 처리할까요?" : "거절할까요?",
      )
    ) {
      return;
    }
    const path =
      decision === "credit"
        ? `/api/v1/admin/wallet/deposit-disputes/${id}/credit`
        : `/api/v1/admin/wallet/deposit-disputes/${id}/reject`;
    const res = await adminSend(path, "POST", {
      idempotencyKey: newIdempotencyKey(),
      reason: actionReason.trim(),
      amountUsdt: decision === "credit" ? creditAmount.trim() : undefined,
    });
    setActionNote(res.ok ? "반영했습니다." : "반영하지 못했습니다.");
    if (res.ok) await reload();
  }

  function jumpUser(event: FormEvent) {
    event.preventDefault();
    const id = userDraft.trim();
    if (!isUuid(id)) {
      setUserInvalid(true);
      return;
    }
    setUserInvalid(false);
    router.push(`/admin/users/${id}`);
  }

  async function loadOps(userId: string) {
    setOpsList(
      await adminGet<unknown>(`/api/v1/admin/users/${userId}/ops-messages`),
    );
  }

  async function sendOps() {
    if (!isUuid(opsUserId.trim())) {
      setActionNote("회원 번호 형식이 아닙니다.");
      return;
    }
    if (!opsTitle.trim() || !opsBody.trim()) {
      setActionNote("제목과 본문을 확인할 수 없습니다.");
      return;
    }
    if (!window.confirm("이 회원에게 안내를 보낼까요?")) return;
    const res = await adminSend(
      `/api/v1/admin/users/${opsUserId.trim()}/ops-messages`,
      "POST",
      {
        template: "OPS_CUSTOM",
        titleKo: opsTitle.trim(),
        bodyKo: opsBody.trim(),
      },
    );
    setActionNote(res.ok ? "반영했습니다." : "반영하지 못했습니다.");
    if (res.ok) await loadOps(opsUserId.trim());
  }

  const items = queue?.ok ? asRecordList(queue.data) : null;
  const opsItems = opsList?.ok ? asRecordList(opsList.data) : null;

  return (
    <main
      className="p-6 text-lux-text"
      data-testid="admin-support"
      data-admin-support-tab={tab}
      data-forbid="fake-support-truth"
    >
      <h1 className="text-xl font-semibold">고객센터 큐</h1>
      <p className="mt-2 text-sm text-lux-text-muted">
        서버에 있는 입금 문의만 봅니다. 없는 티켓·우선순위·처리기한은 만들지
        않습니다.
      </p>

      <nav className="mt-4 flex flex-wrap gap-2 text-sm" data-testid="support-tabs">
        <a
          href="/admin/support?tab=queue"
          data-tab="queue"
          className="rounded px-2 py-1 bg-lux-elevated text-lux-accent"
        >
          대기 큐
        </a>
      </nav>

      <section
        className="mt-6"
        data-testid="support-queue-panel"
        data-queue-api={queueApi}
        data-credit-api="/api/v1/admin/wallet/deposit-disputes/:id/credit"
        data-reject-api="/api/v1/admin/wallet/deposit-disputes/:id/reject"
        data-audit-required="true"
      >
        <p className="text-sm text-lux-text-muted">
          입금 문의 오너 = 기존 분쟁 기록 · 잔액은 분개로만
        </p>
        <p className="mt-1 text-xs text-lux-text-muted">
          다른 문의 전체 목록 경로는 없습니다.
        </p>

        <label className="mt-4 block text-sm" htmlFor="support-reason">
          결정 사유
        </label>
        <textarea
          id="support-reason"
          value={actionReason}
          onChange={(e) => setActionReason(e.target.value)}
          className="mt-1 w-full max-w-md rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
        />
        <label className="mt-3 block text-sm" htmlFor="support-amount">
          입금 처리할 금액
        </label>
        <input
          id="support-amount"
          value={creditAmount}
          onChange={(e) => setCreditAmount(e.target.value)}
          className="mt-1 w-full max-w-md rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
        />

        {!queue ? (
          <p className="mt-3 text-sm text-lux-text-muted">불러오는 중</p>
        ) : !queue.ok ? (
          <AdminFetchNote failure={queue.failure} />
        ) : items == null ? (
          <AdminTruth value={null} testId="support-queue-list" />
        ) : items.length === 0 ? (
          <p
            className="mt-3 text-sm text-lux-text-muted"
            data-testid="support-queue-empty"
          >
            대기 문의가 없습니다.
          </p>
        ) : (
          <ul className="mt-3 space-y-3" data-testid="support-queue-list">
            {items.map((item, idx) => {
              const id = readText(item.id);
              const userId = readText(item.userId);
              const kind = readText(item.kind);
              const status = readText(item.status);
              return (
                <li
                  key={id ?? String(idx)}
                  className="rounded border border-lux-border p-3 text-sm"
                >
                  <p>
                    종류{" "}
                    <AdminTruth value={kind ? (KIND_LABEL[kind] ?? kind) : null} />
                  </p>
                  <p>
                    상태{" "}
                    <AdminTruth
                      value={status ? (STATUS_LABEL[status] ?? status) : null}
                    />
                  </p>
                  <p>
                    금액 <AdminTruth value={readAmount(item.amountUsdt)} />
                  </p>
                  <p>
                    회원 <AdminTruth value={userId} />
                  </p>
                  {id ? (
                    <form className="mt-2 flex flex-wrap gap-2">
                      {userId ? (
                        <a
                          href={`/admin/users/${userId}`}
                          className="rounded px-2 py-1 text-lux-text-muted"
                        >
                          회원 보기
                        </a>
                      ) : null}
                      <button
                        type="submit"
                        className="rounded bg-lux-elevated px-2 py-1"
                        onClick={(e) => void decide(e, id, "credit")}
                      >
                        입금 처리
                      </button>
                      <button
                        type="submit"
                        className="rounded px-2 py-1 text-lux-text-muted"
                        onClick={(e) => void decide(e, id, "reject")}
                      >
                        거절
                      </button>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {actionNote ? (
          <p className="mt-2 text-sm text-lux-text-muted">{actionNote}</p>
        ) : null}
      </section>

      <section className="mt-8 rounded border border-lux-border p-4">
        <h2 className="text-sm font-medium">회원으로 이동</h2>
        <form className="mt-3 space-y-3" onSubmit={jumpUser}>
          <label className="block text-sm" htmlFor="support-user-jump">
            회원 번호
          </label>
          <input
            id="support-user-jump"
            value={userDraft}
            onChange={(e) => setUserDraft(e.target.value)}
            className="w-full max-w-md rounded border border-lux-border bg-lux-bg px-3 py-2"
            autoComplete="off"
          />
          {userInvalid ? (
            <p className="text-sm text-lux-text-muted">회원 번호 형식이 아닙니다.</p>
          ) : null}
          <button type="submit" className="rounded bg-lux-elevated px-3 py-2 text-sm">
            열기
          </button>
        </form>
      </section>

      <section
        className="mt-8 rounded border border-lux-border p-4"
        data-testid="support-ops-panel"
        data-ops-api="/api/v1/admin/users/:id/ops-messages"
      >
        <h2 className="text-sm font-medium">회원 안내</h2>
        <p className="mt-1 text-xs text-lux-text-muted">
          전체 안내 목록은 없습니다. 알고 있는 회원만 조회·발송합니다.
        </p>
        <label className="mt-3 block text-sm" htmlFor="support-ops-user">
          회원 번호
        </label>
        <input
          id="support-ops-user"
          value={opsUserId}
          onChange={(e) => setOpsUserId(e.target.value)}
          className="mt-1 w-full max-w-md rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
        />
        <button
          type="button"
          className="mt-2 rounded px-2 py-1 text-sm text-lux-text-muted"
          onClick={() => {
            if (!isUuid(opsUserId.trim())) {
              setActionNote("회원 번호 형식이 아닙니다.");
              return;
            }
            void loadOps(opsUserId.trim());
          }}
        >
          안내 불러오기
        </button>
        <label className="mt-3 block text-sm" htmlFor="support-ops-title">
          제목
        </label>
        <input
          id="support-ops-title"
          value={opsTitle}
          onChange={(e) => setOpsTitle(e.target.value)}
          className="mt-1 w-full max-w-md rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
        />
        <label className="mt-3 block text-sm" htmlFor="support-ops-body">
          본문
        </label>
        <textarea
          id="support-ops-body"
          value={opsBody}
          onChange={(e) => setOpsBody(e.target.value)}
          className="mt-1 w-full max-w-md rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
        />
        <button
          type="button"
          className="mt-2 rounded bg-lux-elevated px-2 py-1 text-sm"
          onClick={() => void sendOps()}
        >
          안내 보내기
        </button>
        {!opsList ? null : !opsList.ok ? (
          <div className="mt-3">
            <AdminFetchNote failure={opsList.failure} />
          </div>
        ) : opsItems == null ? (
          <AdminTruth value={null} testId="support-ops-list" />
        ) : opsItems.length === 0 ? (
          <p className="mt-3 text-sm text-lux-text-muted">안내가 없습니다.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm" data-testid="support-ops-list">
            {opsItems.map((item, idx) => (
              <li key={readText(item.id) ?? String(idx)}>
                <AdminTruth value={readText(item.titleKo)} />
              </li>
            ))}
          </ul>
        )}
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
