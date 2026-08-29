"use client";

import { Suspense, type ReactNode } from "react";
import { T } from "../copy/ko";

const defaultFallback = (
  <main className="p-6 text-pd-text">
    <p className="text-sm text-pd-text-muted">{T.common.loading}</p>
  </main>
);

/** Next@16 — useSearchParams() must sit under Suspense for static prerender. */
export function SearchParamsBoundary({
  children,
  fallback = defaultFallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
}
