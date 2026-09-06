"use client";

import { FormEvent, useEffect, useState } from "react";
import { T } from "@aipo/ui/copy/ko";
import {
  adminGet,
  adminSend,
  newIdempotencyKey,
  type AdminResult,
} from "../lib/admin-api";
import { readAmount, readMoneyRecordLabel, readText } from "../lib/admin-truth";
import { AdminFetchNote, AdminTruth } from "./AdminTruth";

type BucketsPayload = {
  principalUsdt?: unknown;
  profitUsdt?: unknown;
  lockedUsdt?: unknown;
  practiceUsdt?: unknown;
};
type JournalList = {
  items?: Array<{ id?: unknown; journalType?: unknown; createdAt?: unknown }>;
};

export function User360OpsPanel({
  userId,
  updatedAt,
  onReveal,
  revealed,
}: {
  userId: string;
  updatedAt?: unknown;
  onReveal: (reason: string) => Promise<boolean>;
  revealed: boolean;
}) {
  const [buckets, setBuckets] = useState<AdminResult<BucketsPayload> | null>(null);
  const [journals, setJournals] = useState<AdminResult<JournalList> | null>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      const [b, j] = await Promise.all([
        adminGet<BucketsPayload>(`/api/v1/admin/users/${userId}/buckets`),
        adminGet<JournalList>(
          `/api/v1/admin/ledger/journals?userId=${encodeURIComponent(userId)}`,
        ),
      ]);
      if (cancelled) return;
      setBuckets(b);
      setJournals(j);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function onFreeze(frozen: boolean) {
    if (reason.trim().length < 10) {
      setNote("사유는 10자 이상이어야 합니다.");
      return;
    }
    const path = frozen
      ? `/api/v1/admin/risk/users/${userId}/freeze`
      : `/api/v1/admin/risk/users/${userId}/unfreeze`;
    if (!window.confirm(frozen ? "이용 잠시 멈추기?" : "다시 이용하게 하기?")) return;
    const res = await adminSend(path, "POST", {
      idempotencyKey: newIdempotencyKey(),
      reason: reason.trim(),
    });
    setNote(res.ok ? "반영했습니다." : "반영하지 못했습니다.");
  }

  async function onRevealSubmit(event: FormEvent) {
    event.preventDefault();
    if (reason.trim().length < 10) {
      setNote("사유는 10자 이상이어야 합니다.");
      return;
    }
    const ok = await onReveal(reason.trim());
    setNote(ok ? "가린 정보를 보였습니다." : "보여 주지 못했습니다.");
  }

  const journalItems = journals?.ok && Array.isArray(journals.data.items)
    ? journals.data.items
    : [];

  return (
    <section className="mt-4 space-y-3 text-sm" data-testid="admin-user-360-ops">
      <p className="text-lux-text-muted">최근 로그인 시각은 따로 저장되지 않습니다.</p>
      <p>
        최근 정보 갱신{" "}
        <AdminTruth value={readText(updatedAt)} />
      </p>
      <p className="text-lux-text-muted">이 회원의 기기와 로그인 목록은 아직 확인할 수 없습니다.</p>
      <p>
        <a className="underline" href={`/admin/users/${userId}/adjust`}>
          금액 확인 반영
        </a>
      </p>
      <div data-surface="user-balances">
        <h2 className="text-base font-medium">잔액 구분</h2>
        {!buckets ? (
          <p className="text-lux-text-muted">{T.admin.state.loading}</p>
        ) : !buckets.ok ? (
          <AdminFetchNote failure={buckets.failure} />
        ) : (
          <p>
            <AdminTruth value={readAmount(buckets.data.principalUsdt)} />
            {" / "}
            <AdminTruth value={readAmount(buckets.data.profitUsdt)} />
            {" / "}
            <AdminTruth value={readAmount(buckets.data.lockedUsdt)} />
            {" / "}
            <AdminTruth value={readAmount(buckets.data.practiceUsdt)} />
          </p>
        )}
      </div>
      <div data-surface="user-timeline">
        <h2 className="text-base font-medium">최근 돈의 이동</h2>
        {!journals ? (
          <p className="text-lux-text-muted">{T.admin.state.loading}</p>
        ) : !journals.ok ? (
          <AdminFetchNote failure={journals.failure} />
        ) : journalItems.length === 0 ? (
          <p className="text-lux-text-muted">{T.admin.state.empty}</p>
        ) : (
          <ul className="space-y-1">
            {journalItems.slice(0, 8).map((row, idx) => (
              <li key={String(row.id ?? idx)}>
                <AdminTruth value={readMoneyRecordLabel(row.journalType)} />
              </li>
            ))}
          </ul>
        )}
      </div>
      <form className="space-y-2" onSubmit={onRevealSubmit}>
        <label className="block" htmlFor="user-360-reason">
          보는 이유
        </label>
        <textarea
          id="user-360-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full max-w-md rounded border border-lux-border bg-lux-bg px-2 py-1"
        />
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="rounded bg-lux-elevated px-2 py-1">
            {revealed ? "다시 가리기" : "가린 정보 보기"}
          </button>
          <button
            type="button"
            className="rounded bg-lux-elevated px-2 py-1"
            data-tone="danger"
            onClick={() => void onFreeze(true)}
          >
            이용 잠시 멈추기
          </button>
          <button
            type="button"
            className="rounded bg-lux-elevated px-2 py-1"
            onClick={() => void onFreeze(false)}
          >
            다시 이용하게 하기
          </button>
        </div>
      </form>
      {note ? (
        <p className="text-lux-text-muted" role="status">
          {note}
        </p>
      ) : null}
    </section>
  );
}
