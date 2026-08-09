"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { DepositAmountPanel } from "@aipo/ui/components/wallet/DepositAmountPanel";
import { NetworkPlainWarning } from "@aipo/ui/components/wallet/NetworkPlainWarning";
import { T } from "@aipo/ui/copy/ko";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";

function parseSuggest(raw: string | null): number {
  if (!raw) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.max(1, Math.ceil(n));
}

/**
 * Money §49.2a — `/wallet/deposit?tab=usdt&suggest=&oppId=`
 * Money §41.6 — NetworkPlainWarning above address/QR on USDT tab.
 * suggestDepositUsdt formula = Engine §0.0.5.1 (prefill/chip only here).
 */
function DepositContent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "krw" ? "krw" : "usdt";
  const suggestUsdt = useMemo(
    () => parseSuggest(searchParams.get("suggest")),
    [searchParams],
  );
  const oppId = searchParams.get("oppId");

  const usdtHref = useMemo(() => {
    const q = new URLSearchParams(searchParams.toString());
    q.set("tab", "usdt");
    return `/wallet/deposit?${q.toString()}`;
  }, [searchParams]);

  const krwHref = useMemo(() => {
    const q = new URLSearchParams(searchParams.toString());
    q.set("tab", "krw");
    return `/wallet/deposit?${q.toString()}`;
  }, [searchParams]);

  return (
    <main
      className="p-6 text-lux-text"
      data-testid="wallet-deposit-page"
      data-deposit-suggest={suggestUsdt > 0 ? String(suggestUsdt) : undefined}
      data-classification-owner="engine:§0.0.5.1"
    >
      <h1 className="text-xl font-semibold">{T.deposit.pageTitle}</h1>

      <div
        className="mt-4 flex gap-2"
        role="tablist"
        data-testid="deposit-tabs"
      >
        <Link
          href={usdtHref}
          role="tab"
          aria-selected={tab === "usdt"}
          data-tab="usdt"
          data-active={tab === "usdt" ? "true" : "false"}
          className="rounded-lux-md border border-lux-border px-3 py-2 text-sm"
        >
          {T.deposit.tabUsdt}
        </Link>
        <Link
          href={krwHref}
          role="tab"
          aria-selected={tab === "krw"}
          data-tab="krw"
          data-active={tab === "krw" ? "true" : "false"}
          className="rounded-lux-md border border-lux-border px-3 py-2 text-sm"
        >
          {T.deposit.tabKrw}
        </Link>
      </div>

      {tab === "usdt" ? (
        <section
          className="mt-4 space-y-3"
          data-testid="deposit-usdt-network-block"
        >
          <NetworkPlainWarning />
          <div
            data-testid="deposit-address-panel"
            data-network-label={T.wallet.networkName}
            className="rounded-lux-md border border-lux-border p-3"
          >
            <p className="text-sm text-lux-text-muted">
              {T.wallet.addressLabel}
            </p>
            <p
              className="mt-1 break-all font-mono text-sm"
              data-testid="deposit-address-value"
              data-qr-label={T.wallet.qrLabel}
            >
              {/* filled by GET /api/v1/wallet/my-deposit-address */}
            </p>
            <button
              type="button"
              data-testid="deposit-address-copy"
              className="mt-2 text-sm text-lux-accent"
            >
              {T.wallet.addressCopy}
            </button>
          </div>
        </section>
      ) : null}

      <DepositAmountPanel
        suggestUsdt={suggestUsdt}
        oppId={oppId}
        tab={tab}
      />

      <button
        type="button"
        data-testid="deposit-continue"
        data-force-deposit="false"
        className="mt-6 w-full rounded-lux-md bg-lux-accent px-4 py-3 text-sm font-semibold text-lux-bg"
      >
        {T.deposit.ctaContinue}
      </button>
    </main>
  );
}

export default function Page() {
  return (
    <SearchParamsBoundary>
      <DepositContent />
    </SearchParamsBoundary>
  );
}
