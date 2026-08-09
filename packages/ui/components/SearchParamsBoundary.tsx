"use client";

import { Suspense, type ReactNode } from "react";
import { T } from "../copy/ko";

const defaultFallback = (
  <main className="p-6 text-lux-text">
    <p className="text-sm text-lux-text-muted">{T.common.loading}</p>
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
