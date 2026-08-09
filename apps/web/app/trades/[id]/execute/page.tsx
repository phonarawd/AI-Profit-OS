"use client";

import { useParams, useSearchParams } from "next/navigation";
import { SuccessBucketCtas } from "@aipo/ui/components/wallet/SuccessBucketCtas";
import { T } from "@aipo/ui/copy/ko";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";

/**
 * Execution surface — success state ships §49.4 3CTA
 * (수익만 출금 · 원금에 합치기 · 나중에).
 * Full running/safe_stop UX = Engine/UI execution todos.
 */
function ExecuteContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const state = searchParams.get("state") ?? "running";
  const emphasis =
    searchParams.get("cta") === "merge" ? "merge" : "profit_withdraw";

  return (
    <main
      className="p-6 text-lux-text"
      data-trade-id={params.id}
      data-execution-state={state}
    >
      {state === "success" ? (
        <>
          <h1 className="text-xl font-semibold">{T.execution.successTitle}</h1>
          <p className="mt-2 text-sm text-lux-text-muted">
            {T.execution.successBalance}
          </p>
          <SuccessBucketCtas
            emphasis={emphasis}
            onMerge={() => {
              /* POST /api/v1/wallet/profit/merge — session wiring */
            }}
            onLater={() => {
              window.location.href = "/";
            }}
          />
        </>
      ) : (
        <>
          <h1 className="text-xl font-semibold">{T.execution.progressTitle}</h1>
          <p className="mt-2 text-sm text-lux-text-muted">
            {T.execution.progressHandsFree}
          </p>
        </>
      )}
    </main>
  );
}

export default function Page() {
  return (
    <SearchParamsBoundary>
      <ExecuteContent />
    </SearchParamsBoundary>
  );
}
