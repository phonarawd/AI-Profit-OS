"use client";

import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";
import { DepositAmountPanel } from "@aipo/ui/components/wallet/DepositAmountPanel";
import { DepositAddressQr } from "@aipo/ui/components/wallet/DepositAddressQr";
import { NetworkPlainWarning } from "@aipo/ui/components/wallet/NetworkPlainWarning";
import { T } from "@aipo/ui/copy/ko";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { WalletChrome } from "../WalletChrome";
import styles from "../wallet.module.css";

function parseSuggest(raw: string | null): number {
  if (!raw) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.max(1, Math.ceil(n));
}

type AddressState = "loading" | "ready" | "unavailable" | "unauthorized" | "denied";
type KrwState =
  | "idle"
  | "submitting"
  | "pending"
  | "denied"
  | "unavailable"
  | "unauthorized";

type KrwPending = {
  status: string;
  payableAmountKrw?: number;
  depositCode?: string;
};

function DepositContent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "krw" ? "krw" : "usdt";
  const suggestUsdt = useMemo(
    () => parseSuggest(searchParams.get("suggest")),
    [searchParams],
  );
  const oppId = searchParams.get("oppId");
  const [depositAddress, setDepositAddress] = useState("");
  const [addressState, setAddressState] = useState<AddressState>("loading");
  const [denyCopy, setDenyCopy] = useState<string | null>(null);
  const [copyDone, setCopyDone] = useState(false);
  const [krwAmount, setKrwAmount] = useState("");
  const [depositorName, setDepositorName] = useState("");
  const [krwState, setKrwState] = useState<KrwState>("idle");
  const [krwPending, setKrwPending] = useState<KrwPending | null>(null);

  useEffect(() => {
    if (tab !== "usdt") return;
    const ac = new AbortController();
    setAddressState("loading");
    setDenyCopy(null);
    void (async () => {
      try {
        const res = await fetch("/api/v1/wallet/my-deposit-address", {
          credentials: "include",
          cache: "no-store",
          signal: ac.signal,
        });
        if (res.status === 401) {
          setAddressState("unauthorized");
          return;
        }
        if (res.status === 403) {
          setAddressState("denied");
          setDenyCopy(T.deposit.deniedUsdt);
          return;
        }
        if (!res.ok) {
          setAddressState("unavailable");
          return;
        }
        const json = (await res.json()) as { trc20Address?: string };
        if (typeof json.trc20Address === "string" && json.trc20Address.trim()) {
          setDepositAddress(json.trc20Address);
          setAddressState("ready");
          return;
        }
        setAddressState("unavailable");
      } catch {
        if (!ac.signal.aborted) setAddressState("unavailable");
      }
    })();
    return () => ac.abort();
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

  async function submitKrw() {
    const amount = Number(krwAmount);
    if (!Number.isInteger(amount) || amount < 1 || depositorName.trim().length < 1) {
      setKrwState("denied");
      setDenyCopy(T.deposit.missingValues);
      return;
    }
    setKrwState("submitting");
    setDenyCopy(null);
    try {
      const res = await fetch("/api/v1/wallet/krw-deposit-requests", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          requestedAmountKrw: amount,
          depositorName: depositorName.trim(),
          idempotencyKey: `krw_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        }),
      });
      if (res.status === 401) {
        setKrwState("unauthorized");
        setDenyCopy(T.deposit.unauthorizedKrw);
        return;
      }
      if (res.status === 403) {
        setKrwState("denied");
        setDenyCopy(T.deposit.deniedKrw);
        return;
      }
      if (!res.ok) {
        setKrwState("unavailable");
        setDenyCopy(T.deposit.unavailableKrw);
        return;
      }
      const json = (await res.json()) as KrwPending;
      if (json.status === "pending") {
        setKrwPending(json);
        setKrwState("pending");
        return;
      }
      setKrwState("unavailable");
    } catch {
      setKrwState("unavailable");
    }
  }

  return (
    <WalletChrome tone="paper">
      <main
        className={styles.surface}
        data-testid="wallet-deposit-page"
        data-deposit-tab={tab}
        data-deposit-suggest={suggestUsdt > 0 ? String(suggestUsdt) : undefined}
        data-address-state={tab === "usdt" ? addressState : undefined}
        data-krw-state={tab === "krw" ? krwState : undefined}
        data-classification-owner="engine:§0.0.5.1"
      >
        <header className={styles.pageHead}>
          <p className={styles.pageEyebrow}>{T.deposit.pageTitle}</p>
          <h1 className={styles.pageTitle}>
            {tab === "usdt" ? T.deposit.pageTitleUsdt : T.deposit.pageTitleKrw}
          </h1>
          <p className={styles.lead}>
            {tab === "krw" && krwState === "pending"
              ? T.deposit.submittedLead
              : tab === "usdt"
                ? T.deposit.leadUsdt
                : T.deposit.leadKrw}
          </p>
        </header>

        <div className={styles.tabs} role="tablist" data-testid="deposit-tabs">
          <Link
            href={usdtHref}
            role="tab"
            aria-selected={tab === "usdt"}
            data-tab="usdt"
            data-active={tab === "usdt" ? "true" : "false"}
            className={tab === "usdt" ? styles.tabActive : styles.tab}
          >
            {T.deposit.tabUsdt}
          </Link>
          <Link
            href={krwHref}
            role="tab"
            aria-selected={tab === "krw"}
            data-tab="krw"
            data-active={tab === "krw" ? "true" : "false"}
            className={tab === "krw" ? styles.tabActive : styles.tab}
          >
            {T.deposit.tabKrw}
          </Link>
        </div>

        {tab === "usdt" ? (
          <div className={styles.deskSplit}>
            <section className={styles.card} data-testid="deposit-usdt-network-block">
              <div className={styles.addressHead}>
                <h2 className={styles.cardTitle}>{T.deposit.addressPrimary}</h2>
                <p className={styles.netBadge}>{T.wallet.networkNameFull}</p>
              </div>
              {addressState === "unauthorized" ? (
                <p className={styles.lead}>{T.deposit.unauthorizedUsdt}</p>
              ) : null}
              {addressState === "denied" ? (
                <p className={styles.err}>{denyCopy ?? T.deposit.deniedUsdt}</p>
              ) : null}
              {addressState === "unavailable" ? (
                <p className={styles.err}>{T.deposit.unavailableUsdt}</p>
              ) : null}
              <div className={styles.qrBlock}>
                <div className={styles.qrFrame}>
                  {addressState === "ready" ? (
                    <DepositAddressQr
                      address={depositAddress}
                      label={T.wallet.qrLabel}
                    />
                  ) : (
                    <p className={styles.qrCaption}>{T.wallet.qrLabel}</p>
                  )}
                </div>
                <div
                  data-testid="deposit-address-panel"
                  data-network-label={T.wallet.networkName}
                  className={styles.addressBox}
                >
                  <p>{T.wallet.addressLabel}</p>
                  <p
                    className={styles.mono}
                    data-testid="deposit-address-value"
                    data-qr-label={T.wallet.qrLabel}
                  >
                    {addressState === "ready" ? depositAddress : ""}
                  </p>
                  <button
                    type="button"
                    data-testid="deposit-address-copy"
                    className={styles.copyBtn}
                    disabled={addressState !== "ready"}
                    onClick={() => {
                      if (addressState !== "ready" || !navigator.clipboard) return;
                      void navigator.clipboard.writeText(depositAddress).then(() => {
                        setCopyDone(true);
                      });
                    }}
                  >
                    {copyDone ? T.wallet.addressCopyDone : T.wallet.addressCopy}
                  </button>
                </div>
              </div>
              <NetworkPlainWarning />
              <p className={styles.noticeBody}>{T.wallet.networkWarningLine3}</p>
              <Link className={styles.textLink} href="/me/support?category=deposit&kind=wrong_chain">
                {T.wallet.networkWarningWrongSent} ›
              </Link>
            </section>
            <aside>
              <div className={styles.cardDark}>
                <h2 className={styles.cardTitle}>{T.deposit.amountTitle}</h2>
                <p className={styles.cardSub}>{T.deposit.amountHint}</p>
                <DepositAmountPanel
                  suggestUsdt={suggestUsdt}
                  oppId={oppId}
                  tab={tab}
                />
              </div>
              <div className={styles.noticeOk}>
                <p className={styles.noticeTitle}>{T.deposit.afterDepositTitle}</p>
                <p className={styles.noticeBody}>{T.deposit.afterDepositBody}</p>
              </div>
            </aside>
          </div>
        ) : krwState === "pending" && krwPending ? (
          <section className={styles.submitted} data-testid="deposit-krw-panel">
            <div className={styles.submittedIcon} aria-hidden>
              📝
            </div>
            <h2 className={styles.submittedTitle}>{T.deposit.submittedTitle}</h2>
            <p className={styles.submittedBody}>{T.deposit.submittedBody}</p>
            <dl className={styles.submittedFacts} data-testid="krw-pending">
              <div className={styles.factRow}>
                <dt>{T.deposit.submittedAmount}</dt>
                <dd>
                  {typeof krwPending.payableAmountKrw === "number"
                    ? `${krwPending.payableAmountKrw} ${T.deposit.krwUnit}`
                    : `${T.walletBuckets.missingAmount} ${T.deposit.krwUnit}`}
                </dd>
              </div>
              <div className={styles.factRow}>
                <dt>{T.deposit.submittedCode}</dt>
                <dd>{krwPending.depositCode || T.walletBuckets.missingAmount}</dd>
              </div>
            </dl>
            <p className={styles.submittedBody}>{T.deposit.submittedNotCredited}</p>
          </section>
        ) : (
          <div className={styles.deskSplit}>
            <section className={styles.card} data-testid="deposit-krw-panel">
              <h2 className={styles.cardTitle}>{T.deposit.krwFormTitle}</h2>
              <p className={styles.cardSub}>{T.deposit.krwFormHint}</p>
              <label className={styles.field}>
                {T.deposit.depositorLabel}
                <input
                  data-testid="krw-depositor-name"
                  value={depositorName}
                  placeholder={T.deposit.depositorPlaceholder}
                  onChange={(e) => setDepositorName(e.target.value)}
                />
              </label>
              <label className={styles.field}>
                {T.deposit.amountLabelKrw}
                <span className={styles.amountWrap}>
                  <input
                    data-testid="krw-amount"
                    inputMode="numeric"
                    value={krwAmount}
                    placeholder={T.deposit.amountPlaceholder}
                    onChange={(e) => setKrwAmount(e.target.value)}
                  />
                  <span className={styles.amountUnit}>{T.deposit.krwUnit}</span>
                </span>
              </label>
              <div className={styles.noticeWarn}>
                <p className={styles.noticeTitle}>{T.deposit.krwNoticeTitle}</p>
                <p className={styles.noticeBody}>{T.deposit.krwNoticeBody}</p>
              </div>
              {krwState === "unauthorized" ? (
                <p className={styles.lead}>{denyCopy ?? T.deposit.unauthorizedKrw}</p>
              ) : null}
              {krwState === "denied" ? (
                <p className={styles.err}>{denyCopy ?? T.deposit.deniedKrw}</p>
              ) : null}
              {krwState === "unavailable" ? (
                <p className={styles.err}>{T.deposit.unavailableKrw}</p>
              ) : null}
            </section>
            <aside>
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>{T.deposit.guideTitle}</h2>
                <div className={styles.steps}>
                  <div className={styles.step}>
                    <span className={styles.stepNum}>1</span>
                    <span>{T.deposit.guide1}</span>
                  </div>
                  <div className={styles.step}>
                    <span className={styles.stepNum}>2</span>
                    <span>{T.deposit.guide2}</span>
                  </div>
                  <div className={styles.step}>
                    <span className={styles.stepNum}>3</span>
                    <span>{T.deposit.guide3}</span>
                  </div>
                </div>
              </div>
              <div className={styles.noticeOk}>
                <p className={styles.noticeTitle}>{T.deposit.afterRequestTitle}</p>
                <p className={styles.noticeBody}>{T.deposit.afterRequestBody}</p>
              </div>
            </aside>
          </div>
        )}

        <div className={styles.heroActions} style={{ marginTop: 16 }}>
          {tab === "usdt" ? (
            <button
              type="button"
              data-testid="deposit-continue"
              data-force-deposit="false"
              data-credited="false"
              className={styles.ctaSoft}
              onClick={() => {
                if (addressState !== "ready") {
                  setDenyCopy(T.deposit.unavailableUsdt);
                }
              }}
            >
              {T.deposit.ctaContinue}
            </button>
          ) : (
            <button
              type="button"
              data-testid="deposit-continue"
              data-force-deposit="false"
              data-credited="false"
              className={krwState === "pending" ? styles.ctaSoft : styles.cta}
              disabled={krwState === "submitting"}
              onClick={() => {
                if (krwState === "pending") return;
                void submitKrw();
              }}
            >
              {krwState === "pending" ? T.deposit.backToWallet : T.deposit.ctaSubmit}
            </button>
          )}
          {tab === "krw" && krwState !== "pending" ? (
            <Link className={styles.ctaSoft} href="/wallet">
              {T.deposit.backToWallet}
            </Link>
          ) : null}
        </div>
      </main>
    </WalletChrome>
  );
}

export function DepositClient() {
  return (
    <SearchParamsBoundary>
      <DepositContent />
    </SearchParamsBoundary>
  );
}
