"use client";

import { applyFontScale } from "@aipo/ui/tokens/font-scale";
import { useEffect } from "react";
import {
  parseUserUxPrefs,
  readFontScaleCache,
  writeFontScaleCache,
} from "@aipo/ui/components/settings/ux-prefs-state";

/**
 * 서버 user_ux_prefs가 글자 크기 권위.
 * 캐시는 깜빡임 방지용이며 ready 값이 아니다.
 */
export function FontScaleApply() {
  useEffect(() => {
    const cached = readFontScaleCache();
    if (cached) applyFontScale(cached);
    const ac = new AbortController();
    void (async () => {
      try {
        const res = await fetch("/api/v1/me/ux-prefs", {
          credentials: "include",
          headers: { Accept: "application/json" },
          signal: ac.signal,
        });
        if (!res.ok) return;
        const parsed = parseUserUxPrefs(await res.json().catch(() => null));
        if (!parsed) return;
        applyFontScale(parsed.fontScale);
        writeFontScaleCache(parsed.fontScale);
      } catch {
        /* 캐시 유지 · 가짜 md 확정 금지 */
      }
    })();
    return () => ac.abort();
  }, []);
  return null;
}
