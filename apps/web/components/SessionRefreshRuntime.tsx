"use client";

import { useEffect } from "react";
import { installSessionRefreshFetch } from "../lib/session-refresh-fetch";

/**
 * S1F Section 7 - access token(15분) 만료 후에도 refresh 쿠키(30일)가
 * 남아 있으면 사용자가 로그아웃 없이 계속 쓸 수 있도록 window.fetch에
 * refresh-and-retry-once 동작을 한 번만 설치한다. 화면을 그리지 않는다.
 */
export function SessionRefreshRuntime() {
  useEffect(() => {
    installSessionRefreshFetch();
  }, []);
  return null;
}
