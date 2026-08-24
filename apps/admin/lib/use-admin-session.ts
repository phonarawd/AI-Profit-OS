"use client";

import { useEffect, useState } from "react";
import { adminGet } from "./admin-api";
import {
  ADMIN_SESSION_CHANGE_EVENT,
  hasAdminToken,
} from "./admin-session";

/**
 * 관리자 연결/해제마다 증가. 데이터 fetch useEffect deps에 넣으면
 * 연결 직후 카드가 “연결 필요”에 고정되지 않는다.
 */
export function useAdminSessionRevision(): number {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const bump = () => setRevision((n) => n + 1);
    window.addEventListener(ADMIN_SESSION_CHANGE_EVENT, bump);
    return () => window.removeEventListener(ADMIN_SESSION_CHANGE_EVENT, bump);
  }, []);

  return revision;
}

/**
 * 브라우저 저장소에 문자열이 있다는 사실은 연결 완료의 근거가 아니다.
 * 실제 AdminGuard + server-side RBAC를 통과한 경우에만 true.
 */
export function useAdminConnected(): boolean {
  const revision = useAdminSessionRevision();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!hasAdminToken()) {
      setConnected(false);
      return;
    }

    setConnected(false);
    void (async () => {
      const result = await adminGet<{ connected?: unknown }>("/api/v1/admin/session");
      if (cancelled) return;
      setConnected(result.ok && result.data.connected === true);
    })();

    return () => {
      cancelled = true;
    };
  }, [revision]);

  return connected;
}
