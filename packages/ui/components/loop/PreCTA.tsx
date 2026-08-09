"use client";

import { T } from "../../copy/ko";
import type { PreCTAProps } from "./loop-types";

/**
 * PreCTA / Preflight — §51.24.2
 * mayStop 1줄 필수 · 토큰 없이 participate 스킵 금지 (Nest 412)
 */
export function PreCTA({
  preflightToken = null,
  className = "",
}: PreCTAProps) {
  return (
    <aside
      data-testid="precta"
      data-canon="preflight-confirm"
      data-may-stop="true"
      data-preflight-ready={preflightToken ? "true" : "false"}
      data-skip-forbidden="true"
      aria-label={T.loop.preflightAria}
      className={`rounded-lux-md border border-lux-border bg-lux-elevated px-3 py-2 text-sm ${className}`.trim()}
    >
      <p data-testid="precta-may-stop" data-copy-key="T.loop.mayStop">
        {T.loop.mayStop}
      </p>
      <p className="mt-1 text-xs text-lux-text-muted">{T.loop.preflightHint}</p>
    </aside>
  );
}
