"use client";

import type { AdminFailure } from "../lib/admin-api";
import { UNAVAILABLE_LABEL, failureLabel } from "../lib/admin-truth";

export function AdminTruth({
  value,
  testId,
}: {
  value: string | null | undefined;
  testId?: string;
}) {
  if (value == null || value === "") {
    return (
      <span data-truth="unavailable" data-testid={testId}>
        {UNAVAILABLE_LABEL}
      </span>
    );
  }
  return (
    <span data-truth="present" data-testid={testId}>
      {value}
    </span>
  );
}

export function AdminFetchNote({ failure }: { failure: AdminFailure }) {
  return (
    <p
      className="text-sm text-lux-text-muted"
      data-fetch-kind={failure.kind}
      data-truth={failure.kind === "unavailable" ? "unavailable" : failure.kind}
    >
      {failureLabel(failure)}
    </p>
  );
}
