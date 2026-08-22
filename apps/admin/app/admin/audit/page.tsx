"use client";

import { useEffect, useState } from "react";
import { adminGet, type AdminResult } from "../../../lib/admin-api";
import { asRecordList, readText } from "../../../lib/admin-truth";
import { AdminFetchNote, AdminTruth } from "../../../components/AdminTruth";

const CONTROL_PLANE_API = "/api/v1/admin/audit";
const RESERVE_AUDIT_API = "/api/v1/admin/system-control/reserve/audit";
const POLICY_AUDIT_API = "/api/v1/admin/execution-policy/audit";
const DEPOSIT_AUDIT_API = "/api/v1/admin/wallet/deposit-config/audit";
const REFERRAL_AUDIT_API = "/api/v1/admin/growth/referral/program/audit";

const SECRET_RE = /Bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{10,}\./;

function safeText(value: unknown): string | null {
  const text = readText(value);
  if (!text) return null;
  if (SECRET_RE.test(text)) return "[REDACTED]";
  return text;
}

function AuditPanel({
  title,
  note,
  api,
  testId,
  result,
}: {
  title: string;
  note: string;
  api: string;
  testId: string;
  result: AdminResult<unknown> | null;
}) {
  const items = result?.ok ? asRecordList(result.data) : null;
  return (
    <section
      className="mt-6 rounded border border-lux-border p-3"
      data-testid={testId}
      data-audit-api={api}
      data-forbid="fake-audit-row"
    >
      <h2 className="text-base font-medium">{title}</h2>
      <p className="mt-1 text-sm text-lux-text-muted">{note}</p>
      {!result ? (
        <p className="mt-3 text-sm text-lux-text-muted">불러오는 중</p>
      ) : !result.ok ? (
        <AdminFetchNote failure={result.failure} />
      ) : items == null ? (
        <AdminTruth value={null} testId={`${testId}-list`} />
      ) : items.length === 0 ? (
        <p
          className="mt-3 text-sm text-lux-text-muted"
          data-testid={`${testId}-empty`}
        >
          기록 없음
        </p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm" data-testid={`${testId}-list`}>
          {items.map((row, idx) => (
            <li
              key={readText(row.id) ?? String(idx)}
              className="rounded border border-lux-border p-2"
            >
              <p>
                시각{" "}
                <AdminTruth
                  value={safeText(row.createdAt ?? row.created_at)}
                />
              </p>
              <p>
                사유{" "}
                <AdminTruth
                  value={safeText(
                    row.changeReason ?? row.change_reason ?? row.reason,
                  )}
                />
              </p>
              <p>
                운영자{" "}
                <AdminTruth
                  value={safeText(
                    row.changedByAdminId ??
                      row.changed_by_admin_id ??
                      row.adminId,
                  )}
                />
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Admin §9.1 · REL-214
 * Domain audit panels stay separate. REL-405 schema missing → unavailable.
 * AI logs are not audit. No delete UI.
 */
export default function Page() {
  const [controlPlane, setControlPlane] = useState<AdminResult<unknown> | null>(
    null,
  );
  const [reserve, setReserve] = useState<AdminResult<unknown> | null>(null);
  const [policy, setPolicy] = useState<AdminResult<unknown> | null>(null);
  const [deposit, setDeposit] = useState<AdminResult<unknown> | null>(null);
  const [referral, setReferral] = useState<AdminResult<unknown> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [cp, r, p, d, ref] = await Promise.all([
        adminGet<unknown>(CONTROL_PLANE_API),
        adminGet<unknown>(RESERVE_AUDIT_API),
        adminGet<unknown>(POLICY_AUDIT_API),
        adminGet<unknown>(DEPOSIT_AUDIT_API),
        adminGet<unknown>(REFERRAL_AUDIT_API),
      ]);
      if (cancelled) return;
      setControlPlane(cp);
      setReserve(r);
      setPolicy(p);
      setDeposit(d);
      setReferral(ref);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main
      className="p-6 text-lux-text"
      data-canon="admin-audit"
      data-testid="admin-audit"
      data-forbid="audit-delete"
    >
      <h1 className="text-xl font-semibold">운영 기록</h1>
      <p className="mt-2 text-sm text-lux-text-muted">
        누가 무엇을 바꿨는지 서버 기록만 봅니다. 퍼뜩 대화 기록·장부와 섞지
        않습니다.
      </p>
      <p className="mt-1 text-xs text-lux-text-muted">
        삭제 없음 · 가짜 행 없음 · 비밀값 숨김
      </p>

      <AuditPanel
        title="제어면 기록"
        note="공통 감사 스키마가 있을 때만 표시합니다. 없으면 확인할 수 없음."
        api={CONTROL_PLANE_API}
        testId="audit-control-plane"
        result={controlPlane}
      />
      <AuditPanel
        title="운영 준비금 기록"
        note="준비금 목표 변경만. 장부 원장이 아닙니다."
        api={RESERVE_AUDIT_API}
        testId="audit-reserve"
        result={reserve}
      />
      <AuditPanel
        title="진행 정책 기록"
        note="진행 정책 owner만."
        api={POLICY_AUDIT_API}
        testId="audit-execution-policy"
        result={policy}
      />
      <AuditPanel
        title="입금 설정 기록"
        note="입금 설정 owner만."
        api={DEPOSIT_AUDIT_API}
        testId="audit-deposit-config"
        result={deposit}
      />
      <AuditPanel
        title="초대 프로그램 기록"
        note="초대 프로그램 owner만."
        api={REFERRAL_AUDIT_API}
        testId="audit-referral"
        result={referral}
      />
    </main>
  );
}
