"use client";

import {
  isTradeExecutionRequestError,
  type TradeExecutionState,
} from "@aipo/sdk/execution-stream";
import { fetchTradeList } from "@aipo/sdk/trades";
import { fetchWalletBuckets } from "@aipo/sdk/wallet";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { EarningsEmbed } from "./EarningsEmbed";
import styles from "./trades.module.css";

const USDT_DEC = /^-?[0-9]+(\.[0-9]+)?$/;
const TITLE = "참여 내역";

type ConsumerState =
  | "MatchingInProgress"
  | "MatchingRetrying"
  | "Settled"
  | "StoppedSafely"
  | "Cancelled"
  | "Failed";

type ListKind = "loading" | "ready" | "empty" | "unavailable" | "unauthorized";

function formatUsdtDisplay(raw: string | null | undefined): string | null {
  if (raw == null || raw === "" || !USDT_DEC.test(raw)) return null;
  const neg = raw.startsWith("-");
  const abs = neg ? raw.slice(1) : raw;
  const [w, f = ""] = abs.split(".");
  const whole = w.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const frac = f.padEnd(2, "0").slice(0, 2);
  return `${neg ? "-" : ""}${whole}.${frac}`;
}

function usdtLine(raw: string | null | undefined): string | null {
  const body = formatUsdtDisplay(raw);
  return body ? `${body} USDT` : null;
}

function sessionToken(): string | null {
  return null;
}

function isSettled(state: TradeExecutionState): boolean {
  return (
    state.status === "success" &&
    typeof state.settledProfitUsdt === "string" &&
    USDT_DEC.test(state.settledProfitUsdt)
  );
}

function consumerState(state: TradeExecutionState): ConsumerState | null {
  if (isSettled(state)) return "Settled";
  switch (state.status) {
    case "running":
      return "MatchingInProgress";
    case "requeue":
      return "MatchingRetrying";
    case "safe_stop":
      return "StoppedSafely";
    case "cancelled":
      return "Cancelled";
    case "failed":
      return "Failed";
    default:
      return null;
  }
}

function meaningCopy(state: TradeExecutionState): string {
  const kind = consumerState(state);
  switch (kind) {
    case "MatchingInProgress":
      return "맞추는 중이에요.";
    case "MatchingRetrying":
      return "다시 맞추는 중이에요.";
    case "Settled":
      return "정산이 반영됐어요.";
    case "StoppedSafely":
      return "이번엔 맞지 않았어요.";
    case "Cancelled":
      return "이 진행은 취소됐어요.";
    case "Failed":
      return "지금은 처리할 수 없어요.";
    default:
      return state.status === "success" ? "처리 중이에요." : "불러오는 중…";
  }
}

function isAuthFailure(err: unknown): boolean {
  if (isTradeExecutionRequestError(err) && err.code === "AUTH_REQUIRED") {
    return true;
  }
  return err instanceof Error && /_401\b/.test(err.message);
}

function Shell({
  listState,
  itemCount,
  profitState,
  children,
}: {
  listState: ListKind;
  itemCount?: number;
  profitState?: "ready" | "unavailable";
  children: ReactNode;
}) {
  return (
    <main
      className={styles.page}
      data-testid="trades-shell"
      data-trades-list="true"
      data-list-state={listState}
      data-item-count={itemCount ?? 0}
      data-profit-state={profitState}
    >
      {children}
    </main>
  );
}

export function TradesClient() {
  const [items, setItems] = useState<TradeExecutionState[] | null>(null);
  const [profitUsdt, setProfitUsdt] = useState<string | null>(null);
  const [listError, setListError] = useState<unknown>(null);
  const [profitError, setProfitError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      const [listRes, bucketsRes] = await Promise.allSettled([
        fetchTradeList({
          apiBase: "",
          getAccessToken: sessionToken,
          signal: ac.signal,
        }),
        fetchWalletBuckets({
          apiBase: "",
          getAccessToken: sessionToken,
          signal: ac.signal,
        }),
      ]);
      if (ac.signal.aborted) return;
      if (listRes.status === "fulfilled") {
        setItems(listRes.value.items);
      } else {
        setListError(listRes.reason);
      }
      if (bucketsRes.status === "fulfilled") {
        setProfitUsdt(bucketsRes.value.profitUsdt);
      } else {
        setProfitError(true);
      }
      setLoading(false);
    })();
    return () => ac.abort();
  }, []);

  const authNeeded = isAuthFailure(listError);

  if (loading) {
    return (
      <Shell listState="loading">
        <h1 className={styles.title}>{TITLE}</h1>
        <p className={styles.lead}>불러오는 중…</p>
      </Shell>
    );
  }

  if (authNeeded) {
    return (
      <Shell listState="unauthorized">
        <h1 className={styles.title}>{TITLE}</h1>
        <p className={styles.lead}>로그인하면 참여 내역을 볼 수 있어요.</p>
        <div className={styles.actions}>
          <Link href="/auth/login">로그인</Link>
          <Link className={styles.secondary} href="/">
            홈으로
          </Link>
        </div>
      </Shell>
    );
  }

  const listState: ListKind =
    items == null ? "unavailable" : items.length === 0 ? "empty" : "ready";
  const profitLine = usdtLine(profitUsdt);
  const profitState =
    profitError || profitLine == null ? "unavailable" : "ready";

  return (
    <Shell
      listState={listState}
      itemCount={items?.length ?? 0}
      profitState={profitState}
    >
      <p className={styles.nav}>
        <Link href="/">홈</Link>
      </p>
      <h1 className={styles.title}>{TITLE}</h1>
      <p className={styles.lead}>참여한 기회와 결과예요.</p>
      <EarningsEmbed state={profitState} profitLine={profitLine} />
      {listState === "unavailable" ? (
        <p className={styles.err}>참여 목록을 불러오지 못했어요.</p>
      ) : null}
      {listState === "empty" ? (
        <p className={styles.note}>아직 참여한 기회가 없어요.</p>
      ) : null}
      {items && items.length > 0 ? (
        <ul className={styles.list}>
          {items.map((item) => {
            const kind = consumerState(item);
            const label = item.asset?.label?.trim() || "참여";
            const settled = isSettled(item);
            const settledLine = settled ? usdtLine(item.settledProfitUsdt) : null;
            return (
              <li key={item.tradeId}>
                <Link
                  className={styles.item}
                  href={`/trades/${item.tradeId}/execute`}
                  data-consumer-state={kind ?? undefined}
                  data-trade-status={item.status}
                >
                  <span className={styles.itemName}>{label}</span>
                  <span className={styles.itemMeta}>{meaningCopy(item)}</span>
                  {settledLine ? (
                    <span className={styles.itemMeta}>
                      정산 수익 {settledLine}
                    </span>
                  ) : null}
                </Link>
                {settled ? (
                  <Link
                    className={styles.itemMeta}
                    href={`/trades/${item.tradeId}/settlement`}
                    data-settlement-link="true"
                  >
                    정산 보기
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      <div className={styles.actions}>
        <Link href="/wallet">지갑 보기</Link>
        <Link className={styles.secondary} href="/profits">
          다른 기회 보기
        </Link>
        <Link className={styles.secondary} href="/">
          홈으로
        </Link>
      </div>
    </Shell>
  );
}
