"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { T } from "@aipo/ui/copy/ko";
import {
  adminGet,
  adminSend,
  newIdempotencyKey,
  type AdminResult,
} from "../../../../../lib/admin-api";
import { readAmount, readText } from "../../../../../lib/admin-truth";
import { AdminFetchNote, AdminTruth } from "../../../../../components/AdminTruth";

type BucketsPayload = {
  principalUsdt?: unknown;
  profitUsdt?: unknown;
  lockedUsdt?: unknown;
  practiceUsdt?: unknown;
};

const BUCKETS = [
  { id: "principal", label: "원금" },
  { id: "profit", label: "수익" },
  { id: "locked", label: "진행 중 보관" },
  { id: "practice", label: "연습" },
] as const;

function addUsdt(current: string | null, delta: string, sign: 1 | -1): string | null {
  if (!current) return null;
  const a = Number(current);
  const b = Number(delta);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= 0) return null;
  return (a + sign * b).toFixed(2);
}

export default function AdjustPage() {
  const params = useParams<{ id: string }>();
  const userId = String(params?.id ?? "");
  const [buckets, setBuckets] = useState<AdminResult<BucketsPayload> | null>(null);
  const [bucket, setBucket] = useState<(typeof BUCKETS)[number]["id"]>("principal");
  const [kind, setKind] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [secondApprover, setSecondApprover] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => newIdempotencyKey());

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void adminGet<BucketsPayload>(`/api/v1/admin/users/${userId}/buckets`).then(
      (res) => {
        if (!cancelled) setBuckets(res);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const current = useMemo(() => {
    if (!buckets?.ok) return null;
    const map: Record<string, unknown> = {
      principal: buckets.data.principalUsdt,
      profit: buckets.data.profitUsdt,
      locked: buckets.data.lockedUsdt,
      practice: buckets.data.practiceUsdt,
    };
    return readAmount(map[bucket]);
  }, [buckets, bucket]);

  const after = addUsdt(current, amount, kind === "credit" ? 1 : -1);
  const highAmount = Number(amount) > 1000;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (reason.trim().length < 10) {
      setNote("사유는 10자 이상이어야 합니다.");
      return;
    }
    if (!window.confirm("이 금액을 돈의 이동 기록으로 남길까요? 잔액을 직접 고치지 않습니다.")) {
      return;
    }
    const res = await adminSend(
      `/api/v1/admin/users/${userId}/balance-adjust`,
      "POST",
      {
        bucket,
        kind,
        amountUsdt: amount.trim(),
        reason: reason.trim(),
        idempotencyKey,
        secondApproverId: secondApprover.trim() || undefined,
      },
    );
    setNote(res.ok ? "반영했습니다." : "반영하지 못했습니다.");
    if (res.ok) {
      setBuckets(await adminGet(`/api/v1/admin/users/${userId}/buckets`));
    }
  }

  return (
    <main
      className="p-6 text-lux-text"
      data-testid="admin-user-adjust"
      data-forbid="balance-update"
    >
      <h1 className="text-xl font-semibold">회원 금액 확인 반영</h1>
      <p className="mt-2 text-sm text-lux-text-muted">
        잔액을 직접 고치지 않습니다. 확인된 금액만 돈의 이동 기록으로 남깁니다.
      </p>
      <p className="mt-1 text-sm">
        <a className="underline" href={`/admin/users/${userId}`}>
          회원 정보로 돌아가기
        </a>
      </p>

      {!buckets ? (
        <p className="mt-4 text-sm text-lux-text-muted">{T.admin.state.loading}</p>
      ) : !buckets.ok ? (
        <div className="mt-4">
          <AdminFetchNote failure={buckets.failure} />
        </div>
      ) : (
        <form className="mt-6 max-w-md space-y-3" onSubmit={onSubmit}>
          <label className="block text-sm" htmlFor="adjust-bucket">
            잔액 구분
          </label>
          <select
            id="adjust-bucket"
            value={bucket}
            onChange={(e) =>
              setBucket(e.target.value as (typeof BUCKETS)[number]["id"])
            }
            className="w-full rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
          >
            {BUCKETS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
          <label className="block text-sm" htmlFor="adjust-kind">
            방향
          </label>
          <select
            id="adjust-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as "credit" | "debit")}
            className="w-full rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
          >
            <option value="credit">지급</option>
            <option value="debit">차감</option>
          </select>
          <label className="block text-sm" htmlFor="adjust-amount">
            금액(테더)
          </label>
          <input
            id="adjust-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
            inputMode="decimal"
          />
          <label className="block text-sm" htmlFor="adjust-reason">
            사유
          </label>
          <textarea
            id="adjust-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
          />
          <section
            className="rounded border border-lux-border p-3 text-sm"
            data-testid="adjust-preview"
          >
            <h2 className="font-medium">반영 전 확인</h2>
            <p className="mt-1">
              지금 <AdminTruth value={current} />
            </p>
            <p>
              변경 <AdminTruth value={readText(amount)} />
            </p>
            <p>
              반영 후 <AdminTruth value={after} />
            </p>
            <p className="text-lux-text-muted">대응 계정은 운영 준비금입니다.</p>
          </section>
          {highAmount ? (
            <div>
              <p className="text-sm text-lux-text-muted">
                큰 금액은 다른 관리자 확인이 필요합니다. 같은 사람이 두 번 승인할 수 없습니다.
              </p>
              <label className="mt-2 block text-sm" htmlFor="adjust-second">
                다른 관리자 번호
              </label>
              <input
                id="adjust-second"
                value={secondApprover}
                onChange={(e) => setSecondApprover(e.target.value)}
                className="w-full rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
              />
            </div>
          ) : null}
          <button
            type="submit"
            className="rounded bg-lux-elevated px-3 py-2 text-sm"
            data-tone="danger"
          >
            확인 후 반영
          </button>
          {note ? (
            <p className="text-sm text-lux-text-muted" role="status">
              {note}
            </p>
          ) : null}
        </form>
      )}
    </main>
  );
}
