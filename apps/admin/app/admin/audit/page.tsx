"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";

const TABS = ["records", "rbac"] as const;
type AuditTab = (typeof TABS)[number];

const TAB_LABEL: Record<AuditTab, string> = {
  records: "운영 기록",
  rbac: "권한",
};

function AuditContent() {
  const searchParams = useSearchParams();
  const tab = useMemo((): AuditTab => {
    const raw = searchParams.get("tab");
    if (raw === "rbac") return "rbac";
    return "records";
  }, [searchParams]);

  return (
    <main
      className="p-6 text-lux-text"
      data-testid="admin-audit-page"
      data-admin-audit-tab={tab}
      data-forbid="audit_delete"
    >
      <h1 className="text-xl font-semibold">운영 기록</h1>
      <p className="mt-2 text-sm text-lux-text-muted">누가 무엇을 바꿔는지 봅니다. 기록은 지우지 않습니다.</p>
      <nav className="mt-4 flex flex-wrap gap-2 text-sm" aria-label="운영 기록">
        {TABS.map((t) => (
          <a
            key={t}
            href={t === "records" ? "/admin/audit" : "/admin/audit?tab=rbac"}
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
      {tab === "rbac" ? (
        <section className="mt-6" data-testid="audit-rbac-panel">
          <p
            className="text-sm text-lux-text-muted"
            data-testid="audit-empty-rbac"
          >
            역할 목록이 없습니다.
          </p>
        </section>
      ) : (
        <section className="mt-6" data-testid="audit-records-panel">
          <p
            className="text-sm text-lux-text-muted"
            data-testid="audit-empty-records"
          >
            운영 기록 목록이 없습니다.
          </p>
        </section>
      )}
    </main>
  );
}

export default function Page() {
  return (
    <SearchParamsBoundary>
      <AuditContent />
    </SearchParamsBoundary>
  );
}
