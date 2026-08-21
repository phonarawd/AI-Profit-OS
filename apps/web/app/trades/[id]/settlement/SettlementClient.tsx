"use client";

import {
  isTradeExecutionRequestError,
  type TradeExecutionState,
} from "@aipo/sdk/execution-stream";
import {
  isLedgerRequestError,
  fetchUserJournal,
  fetchUserJournalList,
  type UserJournal,
} from "@aipo/sdk/ledger";
import { fetchTrade } from "@aipo/sdk/trades";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import styles from "./settlement.module.css";

const USDT_DEC = /^-?[0-9]+(\.[0-9]+)?$/;
const TITLE = "정산";

type ViewKind =
  | "loading"
  | "ready"
  | "missing"
  | "unavailable"
  | "unauthorized"
  | "forbidden";

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

function meaningForType(journalType: string): string {
  const t = journalType.toLowerCase();
  if (t.includes("settlement") || t.includes("settle") || t.includes("match")) {
    return "정산";
  }
  if (t.includes("deposit")) return "입금";
  if (t.includes("withdraw")) return "출금";
  return "확인할 수 없음";
}

function directionCopy(direction: "debit" | "credit"): string {
  return direction === "credit" ? "들어옴" : "나감";
}

function Shell({
  view,
  children,
}: {
  view: ViewKind;
  children: ReactNode;
}) {
  return (
    <main
      className={styles.page}
      data-testid="settlement-shell"
      data-settlement-view={view}
    >
      {children}
    </main>
  );
}

export function SettlementClient({ tradeId }: { tradeId: string }) {
  const [trade, setTrade] = useState<TradeExecutionState | null>(null);
  const [journal, setJournal] = useState<UserJournal | null>(null);
  const [journalState, setJournalState] = useState<"ready" | "unavailable">(
    "unavailable",
  );
  const [view, setView] = useState<ViewKind>("loading");

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      try {
        const nextTrade = await fetchTrade(tradeId, {
          apiBase: "",
          getAccessToken: sessionToken,
          signal: ac.signal,
        });
        if (ac.signal.aborted) return;
        setTrade(nextTrade);
        try {
          const list = await fetchUserJournalList({
            apiBase: "",
            getAccessToken: sessionToken,
            signal: ac.signal,
            limit: 100,
          });
          if (ac.signal.aborted) return;
          const match = list.items.find(
            (item) => item.referenceId === nextTrade.tradeId,
          );
          if (!match) {
            setJournal(null);
            setJournalState("unavailable");
            setView("ready");
            return;
          }
          const detail = await fetchUserJournal(match.id, {
            apiBase: "",
            getAccessToken: sessionToken,
            signal: ac.signal,
          });
          if (ac.signal.aborted) return;
          setJournal(detail);
          setJournalState("ready");
          setView("ready");
        } catch (err) {
          if (ac.signal.aborted) return;
          if (isLedgerRequestError(err) && err.code === "FORBIDDEN") {
            setView("forbidden");
            return;
          }
          setJournal(null);
          setJournalState("unavailable");
          setView("ready");
        }
      } catch (err) {
        if (ac.signal.aborted) return;
        if (isTradeExecutionRequestError(err) && err.code === "AUTH_REQUIRED") {
          setView("unauthorized");
          return;
        }
        if (isTradeExecutionRequestError(err) && err.code === "NOT_FOUND") {
          setView("missing");
          return;
        }
        if (
          (isTradeExecutionRequestError(err) && err.status === 403) ||
          (isLedgerRequestError(err) && err.code === "FORBIDDEN")
        ) {
          setView("forbidden");
          return;
        }
        setView("unavailable");
      }
    })();
    return () => ac.abort();
  }, [tradeId]);

  if (view === "loading") {
    return (
      <Shell view="loading">
        <h1 className={styles.title}>{TITLE}</h1>
        <p className={styles.lead}>불러오는 중…</p>
      </Shell>
    );
  }

  if (view === "unauthorized") {
    return (
      <Shell view="unauthorized">
        <h1 className={styles.title}>{TITLE}</h1>
        <p className={styles.lead}>로그인하면 정산을 볼 수 있어요.</p>
        <div className={styles.actions}>
          <Link href="/auth/login">로그인</Link>
          <Link className={styles.secondary} href="/trades">
            참여 내역
          </Link>
        </div>
      </Shell>
    );
  }

  if (view === "forbidden") {
    return (
      <Shell view="forbidden">
        <h1 className={styles.title}>{TITLE}</h1>
        <p className={styles.err}>다른 분의 내역은 볼 수 없어요.</p>
        <div className={styles.actions}>
          <Link href="/trades">참여 내역</Link>
        </div>
      </Shell>
    );
  }

  if (view === "missing") {
    return (
      <Shell view="missing">
        <h1 className={styles.title}>{TITLE}</h1>
        <p className={styles.note}>이 정산을 찾을 수 없어요.</p>
        <div className={styles.actions}>
          <Link href="/trades">참여 내역</Link>
        </div>
      </Shell>
    );
  }

  if (view === "unavailable" || trade == null) {
    return (
      <Shell view="unavailable">
        <h1 className={styles.title}>{TITLE}</h1>
        <p className={styles.err}>정산을 불러오지 못했어요.</p>
        <div className={styles.actions}>
          <Link href="/trades">참여 내역</Link>
        </div>
      </Shell>
    );
  }

  const settledLine = usdtLine(trade.settledProfitUsdt);
  const label = trade.asset?.label?.trim() || "참여";

  return (
    <Shell view="ready">
      <p className={styles.nav}>
        <Link href="/trades">참여 내역</Link>
      </p>
      <h1 className={styles.title}>{TITLE}</h1>
      <p className={styles.lead}>{label}</p>
      <dl className={styles.facts} data-settled-state={settledLine ? "ready" : "unavailable"}>
        <div>
          <dt>정산 수익</dt>
          <dd>{settledLine ?? "확인할 수 없음"}</dd>
        </div>
      </dl>
      {journalState === "ready" && journal ? (
        <ul className={styles.lines} data-journal-state="ready">
          {journal.entries.map((entry) => {
            const amt = usdtLine(entry.amountUsdt);
            return (
              <li key={entry.id} className={styles.line}>
                <span className={styles.lineMeta}>
                  {meaningForType(journal.journalType)} · {directionCopy(entry.direction)}
                </span>
                <span className={styles.lineAmt}>{amt ?? "확인할 수 없음"}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.note} data-journal-state="unavailable">
          정산 줄을 확인할 수 없어요.
        </p>
      )}
      <div className={styles.actions}>
        <Link href={`/trades/${trade.tradeId}/execute`}>진행 보기</Link>
        <Link className={styles.secondary} href="/wallet">
          지갑 보기
        </Link>
      </div>
    </Shell>
  );
}
