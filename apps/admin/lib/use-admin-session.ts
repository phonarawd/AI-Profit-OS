"use client";

import { useEffect, useState } from "react";
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

export function useAdminConnected(): boolean {
  const revision = useAdminSessionRevision();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    setConnected(hasAdminToken());
  }, [revision]);

  return connected;
}
