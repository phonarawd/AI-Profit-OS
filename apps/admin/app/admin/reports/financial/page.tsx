"use client";

import { useEffect, useState } from "react";
import { adminGet, type AdminResult } from "../../../../lib/admin-api";
import { readAmount, readText } from "../../../../lib/admin-truth";
import { AdminFetchNote, AdminTruth } from "../../../../components/AdminTruth";

type Bucket = {
  period?: unknown;
  depositUsdt?: unknown;
  withdrawUsdt?: unknown;
  adminCreditUsdt?: unknown;
  adminDebitUsdt?: unknown;
  settlementUserProfitUsdt?: unknown;
  feeUsdt?: unknown;
  journalCount?: unknown;
};

type Report = {
  granularity?: unknown;
  buckets?: Bucket[];
};

export default function Page() {
  const reportApi = "/api/v1/admin/reports/financial";
  const [report, setReport] = useState<AdminResult<Report> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await adminGet<Report>(reportApi);
      if (!cancelled) setReport(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const buckets = report?.ok && Array.isArray(report.data.buckets) ? report.data.buckets : null;

  return (
    <main className="p-6 text-lux-text" data-testid="admin-financial-page">
      <h1 className="text-xl font-semibold">금융 리포트</h1>
      <p className="mt-2 text-sm text-lux-text-muted">
        원장 집계 오너 · 화면에서 합산하지 않습니다
      </p>
      <section className="mt-6" data-testid="financial-report-panel" data-report-api={reportApi}>
        <p className="text-xs text-lux-text-muted">API: {reportApi}</p>
        {!report ? (
          <p className="mt-3 text-sm text-lux-text-muted">불러오는 중</p>
        ) : !report.ok ? (
          <AdminFetchNote failure={report.failure} />
        ) : buckets && buckets.length === 0 ? (
          <p className="mt-3 text-sm text-lux-text-muted">표시할 기간이 없습니다.</p>
        ) : buckets ? (
          <ul className="mt-3 space-y-3">
            {buckets.map((row, idx) => (
              <li key={readText(row.period) ?? String(idx)} className="rounded border border-lux-border p-3 text-sm">
                <p>기간 <AdminTruth value={readText(row.period)} /></p>
                <p>입금 <AdminTruth value={readAmount(row.depositUsdt)} /></p>
                <p>출금 <AdminTruth value={readAmount(row.withdrawUsdt)} /></p>
                <p>정산 수익 <AdminTruth value={readAmount(row.settlementUserProfitUsdt)} /></p>
                <p>수수료 <AdminTruth value={readAmount(row.feeUsdt)} /></p>
                <p>전표 <AdminTruth value={readText(row.journalCount)} /></p>
              </li>
            ))}
          </ul>
        ) : (
          <AdminTruth value={null} />
        )}
      </section>
    </main>
  );
}
