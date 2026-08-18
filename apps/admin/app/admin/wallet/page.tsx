"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";

const TABS = [
  "deposit-settings",
  "review",
  "krw-pending",
  "disputes",
] as const;
type WalletTab = (typeof TABS)[number];

const TAB_LABEL: Record<WalletTab, string> = {
  "deposit-settings": "입금 설정",
  review: "출금 검토",
  "krw-pending": "원화 대기",
  disputes: "분쟁",
};

/**
 * Admin §9.1.1 / Money §41.6·§51.11 — `/admin/wallet?tab=disputes`
 * Disputes SoT = GET /api/v1/admin/wallet/deposit-disputes
 * Decide = POST .../credit | .../reject · audit required
 */
// route lock: wallet?tab=disputes
function WalletContent() {
  const searchParams = useSearchParams();
  const tab = useMemo((): WalletTab => {
    const raw = searchParams.get("tab");
    if (raw && (TABS as readonly string[]).includes(raw)) {
      return raw as WalletTab;
    }
    return "deposit-settings";
  }, [searchParams]);

  const disputesApi = "/api/v1/admin/wallet/deposit-disputes";
  const creditApi = "/api/v1/admin/wallet/deposit-disputes/:id/credit";
  const rejectApi = "/api/v1/admin/wallet/deposit-disputes/:id/reject";

  return (
    <main
      className="p-6 text-lux-text"
      data-admin-wallet-tab={tab}
      data-testid="admin-wallet-page"
    >
      <h1 className="text-xl font-semibold">입출금 관리</h1>
      <nav
        className="mt-4 flex flex-wrap gap-2 text-sm"
        data-testid="wallet-tabs"
      >
        {TABS.map((t) => (
          <a
            key={t}
            href={`/admin/wallet?tab=${t}`}
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

      {tab === "disputes" ? (
        <section
          className="mt-6"
          data-testid="wallet-disputes-panel"
          data-disputes-api={disputesApi}
          data-credit-api={creditApi}
          data-reject-api={rejectApi}
          data-kind="wrong_chain"
          data-audit-required="true"
        >
          <p className="text-sm text-lux-text-muted">
            오입금·다른 네트워크 분쟁 · 결정마다 감사 기록 · 잔액은 분개로만
          </p>
          <p className="mt-2 text-xs text-lux-text-muted">
            API: {disputesApi}
          </p>
          <p className="mt-1 text-xs text-lux-text-muted">
            network code (admin): TRC20 · 유저 화면 라벨: 트론
          </p>
        </section>
      ) : (
        <section className="mt-6" data-testid={`wallet-${tab}-panel`}>
          <p className="text-sm text-lux-text-muted">
            Admin §9.1.1 골격 · 탭={TAB_LABEL[tab]}
          </p>
        </section>
      )}
    </main>
  );
}

export default function Page() {
  return (
    <SearchParamsBoundary>
      <WalletContent />
    </SearchParamsBoundary>
  );
}
