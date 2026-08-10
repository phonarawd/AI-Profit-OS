"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { T } from "@aipo/ui/copy/ko";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";

/**
 * §51.6 / §51.11 — CS entry.
 * Wrong-chain from §41.6: /me/support?category=deposit&kind=wrong_chain
 * → POST /api/v1/wallet/deposit-disputes (Money contract).
 */
function SupportContent() {
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
      className="p-6 text-lux-text"
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
          <p className="text-sm text-lux-text-muted">
            {T.wallet.supportWrongChainHint}
          </p>
          <p
            className="text-sm"
            data-testid="support-network-hint"
            data-network-label={T.wallet.networkName}
          >
            {T.wallet.networkWarning}
          </p>
          <label className="block text-sm text-lux-text-muted">
            {T.wallet.supportTxHashLabel}
            <input
              data-testid="wrong-chain-tx-hash"
              type="text"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              className="mt-1 w-full rounded-lux-md border border-lux-border bg-transparent px-3 py-2 text-lux-text"
            />
          </label>
          <button
            type="button"
            data-testid="wrong-chain-submit"
            data-create-api={createApi}
            className="w-full rounded-lux-md bg-lux-accent px-4 py-3 text-sm font-semibold text-lux-bg"
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
                  if (res.ok) setSubmitted(true);
                } catch {
                  /* keep form */
                }
              })();
            }}
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
        <p className="mt-2 text-sm text-lux-text-muted">
          문의 카테고리를 선택해 주세요.
        </p>
      )}
    </main>
  );
}

export default function Page() {
  return (
    <SearchParamsBoundary>
      <SupportContent />
    </SearchParamsBoundary>
  );
}
