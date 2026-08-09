"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useTradeExecution } from "@aipo/sdk/execution-stream";
import { SuccessBucketCtas } from "@aipo/ui/components/wallet/SuccessBucketCtas";
import { T } from "@aipo/ui/copy/ko";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";

/**
 * Execution surface — success state ships §49.4 3CTA
 * (수익만 출금 · 원금에 합치기 · 나중에).
 * Live state = useTradeExecution (Phase0 polling · Phase1+ SSE swap in hook only).
 * Full AiProgressRoom / safe_stop UX = ai-execution-ux todo.
 */
function ExecuteContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const queryState = searchParams.get("state") ?? "running";
  const emphasis =
    searchParams.get("cta") === "merge" ? "merge" : "profit_withdraw";

  const tradeId = typeof params.id === "string" ? params.id : undefined;

  const { state, transport, live } = useTradeExecution({
    tradeId,
    // Session JWT wiring lands with auth surface — hook idles without token
    getAccessToken: () => null,
    enabled: Boolean(tradeId),
  });

  const status = state?.status ?? queryState;
  const isSuccess = status === "success";

  return (
    <main
      className="p-6 text-lux-text"
      data-trade-id={tradeId}
      data-execution-state={status}
      data-execution-transport={state?.transport ?? transport}
      data-execution-live={live ? "1" : "0"}
    >
      {isSuccess ? (
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
