"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { T } from "@aipo/ui/copy/ko";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";
import { AccountFrame } from "../AccountFrame";
import styles from "../account.module.css";

/**
 * §51.6 / §51.11 — CS entry.
 * Wrong-chain: /me/support?category=deposit&kind=wrong_chain
 * → POST /api/v1/wallet/deposit-disputes
 */
function SupportContent() {
  const searchParams = useSearchParams();
  const category = searchParams.get("category") === "deposit" ? "deposit" : "other";
  const kind =
    searchParams.get("kind") === "wrong_chain" ? "wrong_chain" : "general";
  const isWrongChain = category === "deposit" && kind === "wrong_chain";

  const [txHash, setTxHash] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitView, setSubmitView] = useState<"idle" | "unavailable">("idle");

  const createApi = useMemo(
    () => "/api/v1/wallet/deposit-disputes",
    [],
  );

  return (
    <AccountFrame title="고객센터" view="ready" testId="support-page">
      <main
        className={styles.surface}
        data-entry="/me/support?category=deposit&kind=wrong_chain"
        data-support-category={category}
        data-support-kind={kind}
        data-dispute-api={isWrongChain ? createApi : undefined}
      >
        <h2 className={styles.sectionTitle}>
          {isWrongChain ? T.wallet.supportWrongChainTitle : "도움이 필요하면"}
        </h2>

        {isWrongChain ? (
          <section className="mt-4 space-y-3" data-testid="wrong-chain-form">
            <p className={styles.note}>{T.wallet.supportWrongChainHint}</p>
            <p
              className={styles.note}
              data-testid="support-network-hint"
              data-network-label={T.wallet.networkName}
            >
              {T.wallet.networkWarning}
            </p>
            <label className={styles.field}>
              {T.wallet.supportTxHashLabel}
              <input
                data-testid="wrong-chain-tx-hash"
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
              />
            </label>
            <div className={styles.actions}>
              <button
                type="button"
                data-testid="wrong-chain-submit"
                data-create-api={createApi}
                onClick={() => {
                  void (async () => {
                    const idem =
                      typeof crypto !== "undefined" && "randomUUID" in crypto
                        ? `dd_${crypto.randomUUID().replace(/-/g, "")}`
                        : `dd_${Date.now()}`;
                    try {
                      const res = await fetch(createApi, {
                        method: "POST",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          kind: "wrong_chain",
                          linkedTxHash: txHash.trim(),
                          idempotencyKey: idem,
                        }),
                      });
                      if (res.ok) {
                        setSubmitted(true);
                        setSubmitView("idle");
                        return;
                      }
                      setSubmitView("unavailable");
                    } catch {
                      setSubmitView("unavailable");
                    }
                  })();
                }}
              >
                {T.wallet.supportSubmit}
              </button>
            </div>
            {submitted ? (
              <p
                className={styles.note}
                data-toast-code="DEPOSIT_DISPUTE_SUBMITTED"
                role="status"
              >
                {T.wallet.supportSubmitted}
              </p>
            ) : null}
            {submitView === "unavailable" ? (
              <p className={styles.err} role="status">
                지금은 신청을 보낼 수 없음
              </p>
            ) : null}
          </section>
        ) : (
          <div className={styles.cardList}>
            <Link href="/me/support?category=deposit&kind=wrong_chain">
              <p className={styles.cardTitle}>입금이 다른 네트워크로 갔어요</p>
              <p className={styles.cardBody}>입금 확인 요청을 남길 수 있어요.</p>
            </Link>
            <Link href="/me/guide/faq">
              <p className={styles.cardTitle}>이용 안내</p>
              <p className={styles.cardBody}>자주 묻는 질문을 먼저 봐요.</p>
            </Link>
            <Link href="/me/legal">
              <p className={styles.cardTitle}>약관과 정보</p>
              <p className={styles.cardBody}>이용 조건을 확인해요.</p>
            </Link>
          </div>
        )}
        <p className={styles.note}>
          바로 연결되는 상담 창은 없어요. 동작하는 안내와 입금 확인만 열려 있어요.
        </p>
      </main>
    </AccountFrame>
  );
}

export default function Page() {
  return (
    <SearchParamsBoundary>
      <SupportContent />
    </SearchParamsBoundary>
  );
}
