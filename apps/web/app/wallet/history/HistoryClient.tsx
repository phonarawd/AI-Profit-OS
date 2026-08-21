"use client";

import {
  fetchUserJournalList,
  isLedgerRequestError,
  type UserJournal,
} from "@aipo/sdk/ledger";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";
import { T } from "@aipo/ui/copy/ko";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import styles from "../wallet.module.css";

const PAGE = 20;
const TITLE = T.user.walletHistory.title;

type ViewKind = "loading" | "ready" | "empty" | "unavailable" | "unauthorized";

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

function formatWhen(iso: string): string {
  if (!iso) return "확인할 수 없음";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "확인할 수 없음";
  return d.toLocaleString("ko-KR");
}

function rowMoney(item: UserJournal): string {
  if (item.entries.length === 1 && item.entries[0]?.amountUsdt) {
    return `${item.entries[0].amountUsdt} USDT`;
  }
  if (item.entries.length === 0) return "확인할 수 없음";
  return `줄 ${item.entries.length}개`;
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
      data-testid="wallet-history"
      data-history-view={view}
    >
      {children}
    </main>
  );
}

function HistoryContent() {
  const searchParams = useSearchParams();
  const offsetRaw = Number(searchParams.get("offset") || "0");
  const offset = Number.isInteger(offsetRaw) && offsetRaw > 0 ? offsetRaw : 0;
  const [items, setItems] = useState<UserJournal[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [view, setView] = useState<ViewKind>("loading");

  useEffect(() => {
    const ac = new AbortController();
    setView("loading");
    void (async () => {
      try {
        const next = await fetchUserJournalList({
          getAccessToken: sessionToken,
          signal: ac.signal,
          limit: PAGE,
          offset,
        });
        if (ac.signal.aborted) return;
        setItems(next.items);
        setTotal(next.total);
        setView(next.items.length === 0 ? "empty" : "ready");
      } catch (err) {
        if (ac.signal.aborted) return;
        setItems([]);
        setTotal(null);
        if (isLedgerRequestError(err) && err.code === "AUTH_REQUIRED") {
          setView("unauthorized");
          return;
        }
        setView("unavailable");
      }
    })();
    return () => ac.abort();
  }, [offset]);

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
        <p className={styles.lead}>로그인하면 내역을 볼 수 있어요.</p>
        <div className={styles.actions}>
          <Link href="/auth/login">로그인</Link>
          <Link className={styles.secondary} href="/wallet">
            지갑으로
          </Link>
        </div>
      </Shell>
    );
  }

  if (view === "unavailable") {
    return (
      <Shell view="unavailable">
        <h1 className={styles.title}>{TITLE}</h1>
        <p className={styles.err}>내역을 확인할 수 없음</p>
        <div className={styles.actions}>
          <Link href="/wallet">지갑으로</Link>
        </div>
      </Shell>
    );
  }

  if (view === "empty") {
    return (
      <Shell view="empty">
        <p className={styles.nav}>
          <Link href="/wallet">지갑</Link>
        </p>
        <h1 className={styles.title}>{TITLE}</h1>
        <p className={styles.note} role="status" data-testid="wallet-history-empty">
          {T.user.empty.walletHistory}
        </p>
      </Shell>
    );
  }

  const hasPrev = offset > 0;
  const hasNext = total != null && offset + items.length < total;

  return (
    <Shell view="ready">
      <p className={styles.nav}>
        <Link href="/wallet">지갑</Link>
      </p>
      <h1 className={styles.title}>{TITLE}</h1>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.id}>
            <Link
              className={styles.row}
              href={`/wallet/history/${encodeURIComponent(item.id)}`}
              data-testid="wallet-history-row"
              data-journal-id={item.id}
            >
              <p className={styles.rowMeta}>
                {meaningForType(item.journalType)} · {formatWhen(item.createdAt)}
              </p>
              <p className={styles.rowAmt}>{rowMoney(item)}</p>
            </Link>
          </li>
        ))}
      </ul>
      <div className={styles.pager}>
        {hasPrev ? (
          <Link href={`/wallet/history?offset=${Math.max(0, offset - PAGE)}`}>
            이전
          </Link>
        ) : null}
        {hasNext ? (
          <Link
            href={`/wallet/history?offset=${offset + PAGE}`}
            data-testid="wallet-history-next"
          >
            다음
          </Link>
        ) : null}
      </div>
    </Shell>
  );
}

export function HistoryClient() {
  return (
    <SearchParamsBoundary>
      <HistoryContent />
    </SearchParamsBoundary>
  );
}
