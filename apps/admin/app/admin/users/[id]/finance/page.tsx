"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { BucketBreakdown } from "@aipo/ui/components/wallet/BucketBreakdown";
import { T } from "@aipo/ui/copy/ko";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";
import { adminGet, type AdminResult } from "../../../../../lib/admin-api";
import { readAmount, readText } from "../../../../../lib/admin-truth";
import { AdminFetchNote, AdminTruth } from "../../../../../components/AdminTruth";

const TABS = [
  "summary",
  "deposits",
  "withdrawals",
  "spread",
  "buckets",
  "ledger",
  "margin",
  "referral",
] as const;

type FinanceTab = (typeof TABS)[number];

type BucketsPayload = {
  principalUsdt?: unknown;
  profitUsdt?: unknown;
  lockedUsdt?: unknown;
  practiceUsdt?: unknown;
  liabilityUsdt?: unknown;
};

type JournalList = {
  items?: Array<{ id?: unknown; journalType?: unknown; createdAt?: unknown }>;
};

/**
 * Admin §9.8.7 / Money §49.6 — `/admin/users/:id/finance?tab=buckets`
 * Buckets SoT = GET /api/v1/admin/users/:id/buckets
 */
// route lock: finance?tab=buckets
function FinanceContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const tab = useMemo((): FinanceTab => {
    const raw = searchParams.get("tab");
    if (raw && (TABS as readonly string[]).includes(raw)) {
      return raw as FinanceTab;
    }
    return "summary";
  }, [searchParams]);

  const userId = params.id;
  const bucketsApi = `/api/v1/admin/users/${userId}/buckets`;
  const [buckets, setBuckets] = useState<AdminResult<BucketsPayload> | null>(
    null,
  );
  const [journals, setJournals] = useState<AdminResult<JournalList> | null>(
    null,
  );

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      const [b, j] = await Promise.all([
        adminGet<BucketsPayload>(bucketsApi),
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
  }, [bucketsApi, userId]);

  const liveBuckets =
    buckets?.ok
      ? {
          principalUsdt: readAmount(buckets.data.principalUsdt),
          profitUsdt: readAmount(buckets.data.profitUsdt),
          lockedUsdt: readAmount(buckets.data.lockedUsdt),
          practiceUsdt: readAmount(buckets.data.practiceUsdt),
          liabilityUsdt: readAmount(buckets.data.liabilityUsdt),
        }
      : null;
  const bucketsReady =
    liveBuckets &&
    liveBuckets.principalUsdt &&
    liveBuckets.profitUsdt &&
    liveBuckets.lockedUsdt &&
    liveBuckets.practiceUsdt &&
    liveBuckets.liabilityUsdt;

  return (
    <main
      className="p-6 text-lux-text"
      data-admin-finance-tab={tab}
      data-user-id={userId}
      data-testid="admin-user-finance"
    >
      <h1 className="text-xl font-semibold">회원 금융</h1>
      <p className="mt-2 text-sm text-lux-text-muted" data-forbid="balance-update">
        잔액 직접 수정 없음
      </p>
      <nav
        className="mt-4 flex flex-wrap gap-2 text-sm"
        data-testid="finance-tabs"
      >
        {TABS.map((t) => (
          <a
            key={t}
            href={`/admin/users/${userId}/finance?tab=${t}`}
            data-tab={t}
            className={
              tab === t
                ? "rounded px-2 py-1 bg-lux-elevated text-lux-accent"
                : "rounded px-2 py-1 text-lux-text-muted"
            }
          >
            {t === "buckets" ? "버킷" : t}
          </a>
        ))}
      </nav>

      {tab === "buckets" ? (
        <section
          className="mt-6"
          data-testid="finance-buckets-panel"
          data-buckets-api={bucketsApi}
          data-practice-visible="true"
        >
          <p className="mt-1 text-sm text-lux-text-muted">
            {T.walletBuckets.defaultProfitHint}
          </p>
          <p
            className="mt-1 text-sm text-lux-text-muted"
            data-testid="finance-practice-note"
          >
            {T.practice.adminNote}
          </p>
          {!buckets ? (
            <p className="mt-4 text-sm text-lux-text-muted">불러오는 중</p>
          ) : !buckets.ok ? (
            <AdminFetchNote failure={buckets.failure} />
          ) : bucketsReady ? (
            <BucketBreakdown
              principalUsdt={liveBuckets.principalUsdt}
              profitUsdt={liveBuckets.profitUsdt}
              lockedUsdt={liveBuckets.lockedUsdt}
              practiceUsdt={liveBuckets.practiceUsdt}
              liabilityUsdt={liveBuckets.liabilityUsdt}
              hidePracticeWhenZero={false}
            />
          ) : (
            <p className="mt-4">
              <AdminTruth value={null} />
            </p>
          )}
        </section>
      ) : tab === "ledger" ? (
        <section className="mt-6 space-y-2">
          {!journals ? (
            <p className="text-sm text-lux-text-muted">불러오는 중</p>
          ) : !journals.ok ? (
            <AdminFetchNote failure={journals.failure} />
          ) : Array.isArray(journals.data.items) &&
            journals.data.items.length === 0 ? (
            <p className="text-sm text-lux-text-muted">전표가 없습니다.</p>
          ) : Array.isArray(journals.data.items) ? (
            <ul className="space-y-2 text-sm">
              {journals.data.items.map((row, idx) => (
                <li
                  key={String(row.id ?? idx)}
                  className="rounded border border-lux-border p-2"
                >
                  <AdminTruth value={readText(row.journalType)} />
                </li>
              ))}
            </ul>
          ) : (
            <AdminTruth value={null} />
          )}
        </section>
      ) : tab === "summary" ? (
        <section className="mt-6 text-sm">
          {!buckets ? (
            <p className="text-lux-text-muted">불러오는 중</p>
          ) : !buckets.ok ? (
            <AdminFetchNote failure={buckets.failure} />
          ) : (
            <p>
              합계{" "}
              <AdminTruth value={liveBuckets?.liabilityUsdt ?? null} />
            </p>
          )}
        </section>
      ) : (
        <p className="mt-6 text-sm text-lux-text-muted">
          <AdminTruth value={null} /> · 이 칸의 전용 조회가 없습니다
        </p>
      )}
    </main>
  );
}

export default function Page() {
  return (
    <SearchParamsBoundary>
      <FinanceContent />
    </SearchParamsBoundary>
  );
}
