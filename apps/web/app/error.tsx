"use client";

import { RecoveryRetry } from "@aipo/ui/components/primitives";
import { T } from "@aipo/ui/copy/ko";

/**
 * App Router 공통 오류 경계. digest·영문 코드·스택을 유저에게 보여 주지 않는다.
 * Home geometry 0.
 */
export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      data-testid="app-error"
      data-canon="app-error"
      style={{
        boxSizing: "border-box",
        minHeight: "100dvh",
        padding: "1.5rem 1.25rem",
        color: "var(--color-lux-text, #08111f)",
      }}
    >
      <h1
        style={{
          margin: "0 0 0.75rem",
          fontSize: "1.5rem",
          fontWeight: 800,
          letterSpacing: "-0.03em",
        }}
      >
        {T.common.errorGeneric}
      </h1>
      <p style={{ margin: "0 0 1.25rem", lineHeight: 1.6 }}>
        화면을 다시 불러오면 이어갈 수 있어요.
      </p>
      <RecoveryRetry
        onRetry={() => reset()}
        style={{
          display: "inline-flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "3rem",
          padding: "0.75rem 1rem",
          border: 0,
          borderRadius: "0.875rem",
          background: "#c81d55",
          color: "#fff",
          font: "inherit",
          fontSize: "1rem",
          fontWeight: 800,
        }}
      />
    </main>
  );
}
