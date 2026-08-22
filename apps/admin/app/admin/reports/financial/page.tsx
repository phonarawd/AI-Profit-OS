"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";
import { adminGet, type AdminResult } from "../../../../lib/admin-api";
import { asRecordList, readAmount, readText } from "../../../../lib/admin-truth";
import { AdminFetchNote, AdminTruth } from "../../../../components/AdminTruth";

const GRANULARITIES = ["day", "month"] as const;
type Granularity = (typeof GRANULARITIES)[number];

type ReportPayload = {
  granularity?: unknown;
  buckets?: unknown;
};

/**
 * Admin §9.1.1 — `/admin/reports/financial`
 * SoT = GET /api/v1/admin/reports/financial (LedgerAdminService.financialReport)
 * 화면 합산 0 · expectedProfitUsdt ≠ settledProfitUsdt · missing ≠ 0
 */
function FinancialContent() {
  const searchParams = useSearchParams();
  const granularity = useMemo((): Granularity => {
    const raw = searchParams.get("granularity");
    return raw === "month" ? "month" : "day";
  }, [searchParams]);

  const reportApi = `/api/v1/admin/reports/financial?granularity=${granularity}`;
  const [report, setReport] = useState<AdminResult<ReportPayload> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await adminGet<ReportPayload>(reportApi);
      if (!cancelled) setReport(res);
    })();
    return () => {
      cancelled = true;
    };
  }, [reportApi]);

  const buckets = report?.ok ? asRecordList(report.data.buckets) : null;

  return (
    <main
      className="p-6 text-lux-text"
      data-testid="admin-financial-report"
      data-forbid="fake-financial-truth"
    >
      <h1 className="text-xl font-semibold">금융 리포트</h1>
      <p className="mt-2 text-sm text-lux-text-muted">
        원장 집계만 봅니다. 화면에서 잔액·수익을 다시 계산하지 않습니다.
      </p>
      <p className="mt-1 text-xs text-lux-text-muted">
        <a href="/admin/ledger" className="underline">
          입출금·정산 장부
        </a>
      </p>

      <nav className="mt-4 flex flex-wrap gap-2 text-sm" aria-label="집계 단위">
        {GRANULARITIES.map((g) => (
          <a
            key={g}
            href={`/admin/reports/financial?granularity=${g}`}
            data-granularity={g}
            className={
              g === granularity
                ? "rounded px-3 py-1 bg-lux-elevated"
                : "rounded px-3 py-1 text-lux-text-muted"
            }
          >
            {g === "day" ? "일" : "월"}
          </a>
        ))}
      </nav>

      <section
        className="mt-6 space-y-3"
        data-testid="financial-report-panel"
        data-report-api={reportApi}
        data-owner="ledger.financialReport"
      >
        <p className="text-sm text-lux-text-muted">
          정산된 수익과 예상 수익은 다릅니다. 이 경로는 정산된 수익만 줍니다.
        </p>

        {!report ? (
          <p className="text-sm text-lux-text-muted">불러오는 중</p>
        ) : !report.ok ? (
          <AdminFetchNote failure={report.failure} />
        ) : buckets == null ? (
          <AdminTruth value={null} testId="financial-report-buckets" />
        ) : buckets.length === 0 ? (
          <p
            className="text-sm text-lux-text-muted"
            data-testid="financial-report-empty"
          >
            이 기간 전표가 없습니다.
          </p>
        ) : (
          <ul className="space-y-3" data-testid="financial-report-list">
            {buckets.map((row, idx) => (
              <li
                key={readText(row.period) ?? String(idx)}
                className="rounded border border-lux-border p-3 text-sm space-y-1"
              >
                <p>
                  기간 <AdminTruth value={readText(row.period)} />
                </p>
                <p>
                  입금{" "}
                  <AdminTruth value={readAmount(row.depositUsdt)} />
                </p>
                <p>
                  출금{" "}
                  <AdminTruth value={readAmount(row.withdrawUsdt)} />
                </p>
                <p>
                  운영 가산{" "}
                  <AdminTruth value={readAmount(row.adminCreditUsdt)} />
                </p>
                <p>
                  운영 차감{" "}
                  <AdminTruth value={readAmount(row.adminDebitUsdt)} />
                </p>
                <p data-field="settledProfitUsdt">
                  정산된 수익{" "}
                  <AdminTruth
                    value={readAmount(row.settlementUserProfitUsdt)}
                  />
                </p>
                <p data-field="expectedProfitUsdt">
                  예상 수익 <AdminTruth value={null} />
                </p>
                <p>
                  수수료 <AdminTruth value={readAmount(row.feeUsdt)} />
                </p>
                <p>
                  전표 수{" "}
                  <AdminTruth
                    value={
                      typeof row.journalCount === "number" &&
                      Number.isFinite(row.journalCount)
                        ? String(row.journalCount)
                        : null
                    }
                  />
                </p>
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
      <FinancialContent />
    </SearchParamsBoundary>
  );
}
