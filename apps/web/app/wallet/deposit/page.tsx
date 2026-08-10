"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DepositAmountPanel } from "@aipo/ui/components/wallet/DepositAmountPanel";
import { NetworkPlainWarning } from "@aipo/ui/components/wallet/NetworkPlainWarning";
import {
  DepositConsult,
  TaxDisclaimerBlock,
  UsdtVsKrwCompareTable,
  WhyUsdtCard,
} from "@aipo/ui/components/trust";
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
 * UI §38 · §51.21 — WhyUsdt + compare + DepositConsult(template Q2/Q4) + tax.
 */
function DepositContent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "krw" ? "krw" : "usdt";
  const suggestUsdt = useMemo(
    () => parseSuggest(searchParams.get("suggest")),
    [searchParams],
  );
  const oppId = searchParams.get("oppId");
  const [depositAddress, setDepositAddress] = useState("");
  const [copyDone, setCopyDone] = useState(false);

  useEffect(() => {
    if (tab !== "usdt") return;
    const ac = new AbortController();
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/v1/wallet/my-deposit-address", {
          credentials: "include",
          cache: "no-store",
          signal: ac.signal,
        });
        if (!res.ok) return;
        const json = (await res.json()) as { trc20Address?: string };
        if (!cancelled && typeof json.trc20Address === "string") {
          setDepositAddress(json.trc20Address);
        }
      } catch {
        /* 401/network — leave empty */
      }
    }
    void load();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [tab]);

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
      <DepositConsult
        fact={{
          balanceUsdt: "0",
          opportunityPreviewCount: 0,
          toneBand: "mid",
          fontScale: "md",
          depositPref: tab,
        }}
      />

      <h1 className="text-xl font-semibold">{T.deposit.pageTitle}</h1>

      <div className="mt-4 space-y-3">
        <WhyUsdtCard />
        <UsdtVsKrwCompareTable />
      </div>

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
              {depositAddress}
            </p>
            <button
              type="button"
              data-testid="deposit-address-copy"
              className="mt-2 text-sm text-lux-accent"
              disabled={!depositAddress}
              onClick={() => {
                if (!depositAddress || !navigator.clipboard) return;
                void navigator.clipboard.writeText(depositAddress).then(() => {
                  setCopyDone(true);
                });
              }}
            >
              {copyDone ? T.wallet.addressCopyDone : T.wallet.addressCopy}
            </button>
          </div>
        </section>
      ) : null}

      <DepositAmountPanel
        suggestUsdt={suggestUsdt}
        oppId={oppId}
        tab={tab}
      />

      <TaxDisclaimerBlock className="mt-4" />

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
