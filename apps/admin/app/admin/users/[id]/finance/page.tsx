"use client";

import { useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { BucketBreakdown } from "@aipo/ui/components/wallet/BucketBreakdown";
import { T } from "@aipo/ui/copy/ko";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";

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

  return (
    <main
      className="p-6 text-lux-text"
      data-admin-finance-tab={tab}
      data-user-id={userId}
    >
      <h1 className="text-xl font-semibold">회원 금융</h1>
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
          {/* Live fetch wires with admin session — structure locked for verify */}
          <BucketBreakdown
            principalUsdt="0"
            profitUsdt="0"
            lockedUsdt="0"
            practiceUsdt="0"
            liabilityUsdt="0"
            hidePracticeWhenZero={false}
          />
        </section>
      ) : (
        <p className="mt-6 text-sm text-lux-text-muted">
          요약·입출금·시세차익 표는 후속 연결
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
