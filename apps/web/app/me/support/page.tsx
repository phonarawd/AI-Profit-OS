"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { T } from "@aipo/ui/copy/ko";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";
import {
  PremiumCard,
  PremiumStatus,
  PremiumSurface,
} from "../../../components/putduk-premium";
import { AccountFrame } from "../AccountFrame";
import styles from "./support.module.css";

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
  const [busy, setBusy] = useState(false);

  const createApi = useMemo(
    () => "/api/v1/wallet/deposit-disputes",
    [],
  );

  return (
    <AccountFrame title="고객센터" view="ready" testId="support-page" hideTitle>
      <div className={styles.page}>
        <p className={`pt-premium-kicker ${styles.kicker}`}>고객센터</p>
        <PremiumSurface
          as="div"
          className={styles.surface}
          data-entry="/me/support?category=deposit&kind=wrong_chain"
          data-support-category={category}
          data-support-kind={kind}
          data-support-surface={isWrongChain ? "wrong-chain" : "general"}
          data-dispute-api={isWrongChain ? createApi : undefined}
        >
          <header className={styles.header}>
            <h1 className="pt-premium-title">
              {isWrongChain ? T.wallet.supportWrongChainTitle : "도움이 필요하면"}
            </h1>
            <p className="pt-premium-description">
              {isWrongChain
                ? T.wallet.supportWrongChainHint
                : "입금 확인과 이용 안내를 여기에서 볼 수 있어요."}
            </p>
          </header>

          {isWrongChain ? (
            <section className={styles.form} data-testid="wrong-chain-form">
              <div
                className={styles.warning}
                data-testid="support-network-hint"
                data-network-label={T.wallet.networkName}
              >
                <PremiumStatus label="네트워크 확인" tone="warning" />
                <p id="support-network-hint-text">{T.wallet.networkWarning}</p>
                <p>{T.wallet.networkWarningLine2}</p>
              </div>
              <form
                className={styles.formFields}
                onSubmit={(event) => {
                  event.preventDefault();
                  if (busy) return;
                  const idem =
                    typeof crypto !== "undefined" && "randomUUID" in crypto
                      ? `dd_${crypto.randomUUID().replace(/-/g, "")}`
                      : `dd_${Date.now()}`;
                  setBusy(true);
                  void (async () => {
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
                    } finally {
                      setBusy(false);
                    }
                  })();
                }}
              >
                <label className={styles.field} htmlFor="support-tx-hash">
                  {T.wallet.supportTxHashLabel}
                </label>
                <input
                  id="support-tx-hash"
                  className={`${styles.fieldInput} pt-premium-focus`}
                  data-testid="wrong-chain-tx-hash"
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={txHash}
                  aria-describedby="support-network-hint-text"
                  onChange={(e) => setTxHash(e.target.value)}
                />
                <button
                  className={`${styles.submit} pt-premium-focus`}
                  type="submit"
                  data-testid="wrong-chain-submit"
                  data-create-api={createApi}
                  disabled={busy}
                  aria-busy={busy}
                >
                  {T.wallet.supportSubmit}
                </button>
              </form>
              {submitted ? (
                <div
                  className={styles.success}
                data-toast-code="DEPOSIT_DISPUTE_SUBMITTED"
                role="status"
              >
                  <PremiumStatus label={"\uC811\uC218\uB428"} tone="success" />
                  <p>{T.wallet.supportSubmitted}</p>
                </div>
              ) : null}
              {submitView === "unavailable" ? (
                <p className={styles.err} role="status">
                  지금은 신청을 보낼 수 없음
                </p>
              ) : null}
            </section>
          ) : (
            <div className={styles.cards}>
              <PremiumCard
                as={Link}
                href="/me/support?category=deposit&kind=wrong_chain"
                interactive
                className={`${styles.card} pt-premium-focus`}
              >
                <span className={styles.cardCopy}>
                  <span className={styles.cardTitle}>입금이 다른 네트워크로 갔어요</span>
                  <span className={styles.cardBody}>입금 확인 요청을 남길 수 있어요.</span>
                </span>
                <span className={styles.cardAffordance} aria-hidden="true" />
              </PremiumCard>
              <PremiumCard
                as={Link}
                href="/me/guide/faq"
                interactive
                className={`${styles.card} pt-premium-focus`}
              >
                <span className={styles.cardCopy}>
                  <span className={styles.cardTitle}>이용 안내</span>
                  <span className={styles.cardBody}>자주 묻는 질문을 먼저 봐요.</span>
                </span>
                <span className={styles.cardAffordance} aria-hidden="true" />
              </PremiumCard>
              <PremiumCard
                as={Link}
                href="/me/legal"
                interactive
                className={`${styles.card} pt-premium-focus`}
              >
                <span className={styles.cardCopy}>
                  <span className={styles.cardTitle}>약관과 정보</span>
                  <span className={styles.cardBody}>이용 조건을 확인해요.</span>
                </span>
                <span className={styles.cardAffordance} aria-hidden="true" />
              </PremiumCard>
            </div>
          )}
          <p className={styles.notice}>
            바로 연결되는 상담 창은 없어요. 동작하는 안내와 입금 확인만 열려 있어요.
          </p>
        </PremiumSurface>
      </div>
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
