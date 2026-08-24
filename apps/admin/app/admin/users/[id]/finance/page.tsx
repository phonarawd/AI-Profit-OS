"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { BucketBreakdown } from "@aipo/ui/components/wallet/BucketBreakdown";
import { T } from "@aipo/ui/copy/ko";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";
import { adminGet, type AdminResult } from "../../../../../lib/admin-api";
import { readAmount, readMoneyRecordLabel, readText } from "../../../../../lib/admin-truth";
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

const TAB_LABEL: Record<FinanceTab, string> = {
  summary: "한눈에 보기",
  deposits: "입금",
  withdrawals: "출금",
  spread: "거래 차액",
  buckets: "잔액 구분",
  ledger: "돈의 이동 기록",
  margin: "수익률",
  referral: "친구 초대 혜택",
};

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

type LiveBuckets = {
  principalUsdt: string;
  profitUsdt: string;
  lockedUsdt: string;
  practiceUsdt: string;
  liabilityUsdt: string;
};

function readLiveBuckets(data: BucketsPayload): LiveBuckets | null {
  const principalUsdt = readAmount(data.principalUsdt);
  const profitUsdt = readAmount(data.profitUsdt);
  const lockedUsdt = readAmount(data.lockedUsdt);
  const practiceUsdt = readAmount(data.practiceUsdt);
  const liabilityUsdt = readAmount(data.liabilityUsdt);
  if (
    !principalUsdt ||
    !profitUsdt ||
    !lockedUsdt ||
    !practiceUsdt ||
    !liabilityUsdt
  ) {
    return null;
  }
  return {
    principalUsdt,
    profitUsdt,
    lockedUsdt,
    practiceUsdt,
    liabilityUsdt,
  };
}

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

  const liveBuckets = buckets?.ok
    ? readLiveBuckets(buckets.data)
    : null;

  return (
    <main
      className="p-6 text-lux-text"
      data-admin-finance-tab={tab}
      data-user-id={userId}
      data-testid="admin-user-finance"
    >
      <h1 className="text-xl font-semibold">회원 입출금·수익</h1>
      <p className="mt-2 text-sm text-lux-text-muted" data-forbid="balance-update">
        안전을 위해 이 화면에서 회원 잔액을 직접 고칠 수 없습니다.
      </p>
      <nav
        className="mt-4 flex flex-wrap gap-2 text-sm"
        data-testid="finance-tabs"
        aria-label="회원 입출금·수익 메뉴"
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
            {TAB_LABEL[t]}
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
            <p className="mt-4 text-sm text-lux-text-muted">{T.admin.state.loading}</p>
          ) : !buckets.ok ? (
            <AdminFetchNote failure={buckets.failure} />
          ) : liveBuckets ? (
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
            <p className="text-sm text-lux-text-muted">{T.admin.state.loading}</p>
          ) : !journals.ok ? (
            <AdminFetchNote failure={journals.failure} />
          ) : Array.isArray(journals.data.items) &&
            journals.data.items.length === 0 ? (
            <p className="text-sm text-lux-text-muted">아직 돈의 이동 기록이 없습니다.</p>
          ) : Array.isArray(journals.data.items) ? (
            <ul className="space-y-2 text-sm">
              {journals.data.items.map((row, idx) => (
                <li
                  key={String(row.id ?? idx)}
                  className="rounded border border-lux-border p-2"
                >
                  <AdminTruth value={readMoneyRecordLabel(row.journalType)} />
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
            <p className="text-lux-text-muted">{T.admin.state.loading}</p>
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
          이 항목은 아직 확인 기능이 준비되지 않았습니다. <AdminTruth value={null} />
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
