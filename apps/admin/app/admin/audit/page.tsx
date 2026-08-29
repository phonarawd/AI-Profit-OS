"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";
import { T } from "@aipo/ui/copy/ko";

const TABS = ["records", "rbac"] as const;
type AuditTab = (typeof TABS)[number];

const TAB_LABEL: Record<AuditTab, string> = {
  records: "바꾼 내용",
  rbac: "관리자 권한",
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
      className="p-6 text-pd-text"
      data-testid="admin-audit-page"
      data-admin-audit-tab={tab}
      data-forbid="audit_delete"
    >
      <h1 className="text-xl font-semibold">{T.admin.navigation.audit}</h1>
      <p className="mt-2 text-sm text-pd-text-muted">어떤 관리자가 무엇을 바꿨는지 확인합니다. 안전을 위해 기록은 지울 수 없습니다.</p>
      <nav className="mt-4 flex flex-wrap gap-2 text-sm" aria-label="관리자 작업 기록 메뉴">
        {TABS.map((t) => (
          <a
            key={t}
            href={t === "records" ? "/admin/audit" : "/admin/audit?tab=rbac"}
            data-tab={t}
            className={
              tab === t
                ? "rounded px-2 py-1 bg-pd-elevated text-pd-accent"
                : "rounded px-2 py-1 text-pd-text-muted"
            }
          >
            {TAB_LABEL[t]}
          </a>
        ))}
      </nav>
      {tab === "rbac" ? (
        <section className="mt-6" data-testid="audit-rbac-panel">
          <p
            className="text-sm text-pd-text-muted"
            data-testid="audit-empty-rbac"
          >
            표시할 관리자 권한이 없습니다.
          </p>
        </section>
      ) : (
        <section className="mt-6" data-testid="audit-records-panel">
          <p
            className="text-sm text-pd-text-muted"
            data-testid="audit-empty-records"
          >
            아직 관리자가 바꾼 기록이 없습니다.
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
