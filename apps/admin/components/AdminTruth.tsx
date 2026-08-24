"use client";

import type { AdminFailure } from "../lib/admin-api";
import { UNAVAILABLE_LABEL, failureLabel } from "../lib/admin-truth";
import { T } from "@aipo/ui/copy/ko";

export function AdminTruth({
  value,
  testId,
}: {
  value: string | null | undefined;
  testId?: string;
}) {
  if (value == null || value === "") {
    return (
      <span
        className="admin-truth admin-truth-unavailable"
        data-truth="unavailable"
        data-testid={testId}
      >
        {UNAVAILABLE_LABEL}
      </span>
    );
  }
  return (
    <span className="admin-truth" data-truth="present" data-testid={testId}>
      {value}
    </span>
  );
}

export function AdminFetchNote({ failure }: { failure: AdminFailure }) {
  return (
    <div
      className="admin-fetch-note"
      data-fetch-kind={failure.kind}
      data-truth={failure.kind === "unavailable" ? "unavailable" : failure.kind}
      role="status"
    >
      <strong>{failureLabel(failure)}</strong>
      {failure.kind === "unavailable" ? (
        <span>{T.admin.state.unavailableHint}</span>
      ) : null}
    </div>
  );
}
