"use client";

import {
  classifyIdempotencyHttp,
  createIdempotencyLifecycle,
  fetchWalletBuckets,
  krwDepositFingerprint,
  mintMoneyIdempotencyKey,
} from "@aipo/sdk/wallet";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";
import {
  DepositConsult,
  TaxDisclaimerBlock,
  UsdtVsKrwCompareTable,
  WhyUsdtCard,
} from "@aipo/ui/components/trust";
import { DepositAmountPanel } from "@aipo/ui/components/wallet/DepositAmountPanel";
import { NetworkPlainWarning } from "@aipo/ui/components/wallet/NetworkPlainWarning";
import { T } from "@aipo/ui/copy/ko";
import Link from "next/link";
import {
  classifyKrwInstructionsHttp,
  parseSafeKrwDepositInstructions,
  type KrwInstructionsView,
  type SafeKrwDepositInstructions,
} from "./krw-deposit-instructions";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "../wallet.module.css";

function parseSuggest(raw: string | null): number {
  if (!raw) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.max(1, Math.ceil(n));
}

function sessionToken(): string | null {
  return null;
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
  const [principalUsdt, setPrincipalUsdt] = useState<string | null>(null);
  const [krwAmount, setKrwAmount] = useState("");
  const [depositorName, setDepositorName] = useState("");
  const [krwState, setKrwState] = useState<KrwState>("idle");
  const [krwPending, setKrwPending] = useState<KrwPending | null>(null);
  const [instrState, setInstrState] = useState<KrwInstructionsView>("loading");
  const [instructions, setInstructions] = useState<SafeKrwDepositInstructions | null>(null);
  const krwIdem = useRef(
    createIdempotencyLifecycle({ mint: () => mintMoneyIdempotencyKey("krw") }),
  );

  useEffect(() => {
    const ac = new AbortController();
    void fetchWalletBuckets({
      getAccessToken: sessionToken,
      signal: ac.signal,
    })
      .then((buckets) => {
        setPrincipalUsdt(buckets.principalUsdt);
      })
      .catch(() => {
        setPrincipalUsdt(null);
      });
    return () => ac.abort();
  }, []);

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
          setDenyCopy("지금은 입금 주소를 열 수 없어요.");
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

  useEffect(() => {
    if (tab !== "krw") return;
    const ac = new AbortController();
    setInstrState("loading");
    setInstructions(null);
    void (async () => {
      try {
        const res = await fetch("/api/v1/wallet/krw-deposit-instructions", {
          credentials: "include",
          cache: "no-store",
          signal: ac.signal,
        });
        if (!res.ok) {
          setInstrState(classifyKrwInstructionsHttp(res.status));
          return;
        }
        const parsed = parseSafeKrwDepositInstructions(
          await res.json().catch(() => null),
        );
        if (!parsed) {
          setInstrState("unavailable");
          return;
        }
        setInstructions(parsed);
        setInstrState("ready");
      } catch {
        if (!ac.signal.aborted) setInstrState("unavailable");
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
    if (instrState !== "ready" || !instructions) {
      setKrwState(instrState === "unauthorized" ? "unauthorized" : "unavailable");
      setDenyCopy(
        instrState === "unauthorized"
          ? "로그인하면 원화 입금을 신청할 수 있어요."
          : "입금 안내를 확인할 수 없음",
      );
      return;
    }
    const amount = Number(krwAmount);
    if (!Number.isInteger(amount) || amount < 1 || depositorName.trim().length < 1) {
      setKrwState("denied");
      setDenyCopy("입금 신청에 필요한 값이 부족해요.");
      return;
    }
    const started = krwIdem.current.begin(
      krwDepositFingerprint(amount, depositorName),
    );
    if ("blocked" in started) return;
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
          idempotencyKey: started.key,
        }),
      });
      if (res.status === 401) {
        krwIdem.current.retire();
        setKrwState("unauthorized");
        setDenyCopy("로그인하면 원화 입금을 신청할 수 있어요.");
        return;
      }
      if (res.status === 403) {
        krwIdem.current.retire();
        setKrwState("denied");
        setDenyCopy("지금은 원화 입금을 신청할 수 없어요.");
        return;
      }
      if (!res.ok) {
        if (classifyIdempotencyHttp(res.status) === "retain") krwIdem.current.retain();
        else krwIdem.current.retire();
        setKrwState("unavailable");
        setDenyCopy("입금 신청을 확인할 수 없음");
        return;
      }
      const json = (await res.json().catch(() => null)) as KrwPending | null;
      if (!json) {
        krwIdem.current.retain();
        setKrwState("unavailable");
        return;
      }
      if (json.status === "pending") {
        krwIdem.current.retire();
        setKrwPending(json);
        setKrwState("pending");
        return;
      }
      krwIdem.current.retain();
      setKrwState("unavailable");
    } catch {
      krwIdem.current.retain();
      setKrwState("unavailable");
    }
  }

  return (
    <main
      className={styles.page}
      data-testid="wallet-deposit-page"
      data-deposit-tab={tab}
      data-deposit-suggest={suggestUsdt > 0 ? String(suggestUsdt) : undefined}
      data-address-state={tab === "usdt" ? addressState : undefined}
      data-krw-state={tab === "krw" ? krwState : undefined}
      data-krw-instr-state={tab === "krw" ? instrState : undefined}
      data-classification-owner="engine:§0.0.5.1"
    >
      <DepositConsult
        fact={{
          ...(principalUsdt ? { balanceUsdt: principalUsdt } : {}),
          toneBand: "mid",
          fontScale: "md",
          depositPref: tab,
        }}
      />
      <p className={styles.nav}>
        <Link href="/wallet">지갑</Link>
      </p>
      <h1 className={styles.title}>{T.deposit.pageTitle}</h1>
      <div className={styles.trust}>
        <WhyUsdtCard />
        <UsdtVsKrwCompareTable className="bg-lux-elevated" />
      </div>
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
        <section className={styles.panel} data-testid="deposit-usdt-network-block">
          <NetworkPlainWarning />
          {addressState === "unauthorized" ? (
            <p className={styles.lead}>로그인하면 입금 주소를 볼 수 있어요.</p>
          ) : null}
          {addressState === "denied" ? (
            <p className={styles.err}>{denyCopy ?? "지금은 입금 주소를 열 수 없어요."}</p>
          ) : null}
          {addressState === "unavailable" ? (
            <p className={styles.err}>입금 주소를 확인할 수 없음</p>
          ) : null}
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
        </section>
      ) : (
        <section className={styles.panel} data-testid="deposit-krw-panel">
          <p className={styles.note}>
            원화는 신청만 받아요. 확인되기 전에는 잔액이 늘지 않아요.
          </p>
          {instrState === "unauthorized" ? (
            <p className={styles.lead} data-testid="krw-instr-unauthorized">
              로그인하면 입금 안내를 볼 수 있어요.
            </p>
          ) : null}
          {instrState === "unavailable" ? (
            <p className={styles.err} data-testid="krw-instr-unavailable">
              입금 안내를 확인할 수 없음
            </p>
          ) : null}
          {instrState === "ready" && instructions ? (
            <div
              className={styles.addressBox}
              data-testid="krw-deposit-instructions"
            >
              <p data-testid="krw-instr-bank">{instructions.bankName}</p>
              <p className={styles.mono} data-testid="krw-instr-account">
                {instructions.accountNumber}
              </p>
              <p data-testid="krw-instr-holder">{instructions.accountHolder}</p>
              {instructions.noticeKo ? (
                <p className={styles.note} data-testid="krw-instr-notice">
                  {instructions.noticeKo}
                </p>
              ) : null}
            </div>
          ) : null}
          <label className={styles.field}>
            입금자 이름
            <input
              data-testid="krw-depositor-name"
              value={depositorName}
              onChange={(e) => setDepositorName(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            신청 금액
            <input
              data-testid="krw-amount"
              inputMode="numeric"
              value={krwAmount}
              onChange={(e) => setKrwAmount(e.target.value)}
            />
          </label>
          {krwState === "pending" && krwPending ? (
            <p className={styles.note} data-testid="krw-pending">
              신청을 받았어요. 아직 잔액에 넣지 않았어요.
              {typeof krwPending.payableAmountKrw === "number"
                ? ` 받을 금액 ${krwPending.payableAmountKrw}`
                : ""}
              {krwPending.depositCode ? ` · ${krwPending.depositCode}` : ""}
            </p>
          ) : null}
          {krwState === "unauthorized" ? (
            <p className={styles.lead}>
              {denyCopy ?? "로그인하면 원화 입금을 신청할 수 있어요."}
            </p>
          ) : null}
          {krwState === "denied" ? (
            <p className={styles.err}>{denyCopy ?? "입금 신청을 받지 못했어요."}</p>
          ) : null}
          {krwState === "unavailable" ? (
            <p className={styles.err}>입금 신청을 확인할 수 없음</p>
          ) : null}
        </section>
      )}

      <div className={styles.onNavy}>
        <DepositAmountPanel
          suggestUsdt={suggestUsdt}
          oppId={oppId}
          tab={tab}
          onAmountChange={(amount) => {
            if (tab === "krw") setKrwAmount(amount);
          }}
        />
      </div>
      <TaxDisclaimerBlock className="mt-4" />
      <div className={styles.actions}>
        {tab === "usdt" ? (
          <button
            type="button"
            data-testid="deposit-continue"
            data-force-deposit="false"
            data-credited="false"
            onClick={() => {
              if (addressState !== "ready") {
                setDenyCopy("입금 주소가 준비되기 전에는 다음으로 가지 않아요.");
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
            disabled={
              krwState === "submitting" ||
              krwState === "pending" ||
              instrState !== "ready"
            }
            onClick={() => {
              void submitKrw();
            }}
          >
            {krwState === "pending" ? "신청됨" : "입금 신청"}
          </button>
        )}
        <Link className={styles.secondary} href="/wallet">
          지갑으로
        </Link>
      </div>
    </main>
  );
}

export function DepositClient() {
  return (
    <SearchParamsBoundary>
      <DepositContent />
    </SearchParamsBoundary>
  );
}
