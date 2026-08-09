"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { T } from "@aipo/ui/copy/ko";

/**
 * §51.6 / §51.11 — CS entry.
 * Wrong-chain from §41.6: /me/support?category=deposit&kind=wrong_chain
 * → POST /api/v1/wallet/deposit-disputes (Money contract).
 */
export default function Page() {
  const searchParams = useSearchParams();
  const category = searchParams.get("category") === "deposit" ? "deposit" : "other";
  const kind =
    searchParams.get("kind") === "wrong_chain" ? "wrong_chain" : "general";
  const isWrongChain = category === "deposit" && kind === "wrong_chain";

  const [txHash, setTxHash] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const createApi = useMemo(
    () => "/api/v1/wallet/deposit-disputes",
    [],
  );

  return (
    <main
      className="p-6 text-[var(--color-lux-text)]"
      data-testid="support-page"
      data-entry="/me/support?category=deposit&kind=wrong_chain"
      data-support-category={category}
      data-support-kind={kind}
      data-dispute-api={isWrongChain ? createApi : undefined}
    >
      <h1 className="text-xl font-semibold">
        {isWrongChain
          ? T.wallet.supportWrongChainTitle
          : "고객센터"}
      </h1>

      {isWrongChain ? (
        <section className="mt-4 space-y-3" data-testid="wrong-chain-form">
          <p className="text-sm text-[var(--color-lux-text-muted)]">
            {T.wallet.supportWrongChainHint}
          </p>
          <p
            className="text-sm"
            data-testid="support-network-hint"
            data-network-label={T.wallet.networkName}
          >
            {T.wallet.networkWarning}
          </p>
          <label className="block text-sm text-[var(--color-lux-text-muted)]">
            {T.wallet.supportTxHashLabel}
            <input
              data-testid="wrong-chain-tx-hash"
              type="text"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--color-lux-border)] bg-transparent px-3 py-2 text-[var(--color-lux-text)]"
            />
          </label>
          <button
            type="button"
            data-testid="wrong-chain-submit"
            data-create-api={createApi}
            className="w-full rounded-[var(--radius-md)] bg-[var(--color-lux-accent)] px-4 py-3 text-sm font-semibold text-[var(--color-lux-bg)]"
            onClick={() => setSubmitted(true)}
          >
            {T.wallet.supportSubmit}
          </button>
          {submitted ? (
            <p
              className="text-sm"
              data-toast-code="DEPOSIT_DISPUTE_SUBMITTED"
              role="status"
            >
              {T.wallet.supportSubmitted}
            </p>
          ) : null}
        </section>
      ) : (
        <p className="mt-2 text-sm text-[var(--color-lux-text-muted)]">
          문의 카테고리를 선택해 주세요.
        </p>
      )}
    </main>
  );
}
