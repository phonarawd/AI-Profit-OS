"use client";

import { useEffect, useState } from "react";
import {
  ADMIN_SESSION_CHANGE_EVENT,
  fetchAdminSessionConnected,
} from "./admin-session";

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
    let cancelled = false;
    void fetchAdminSessionConnected().then((ok) => {
      if (!cancelled) setConnected(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [revision]);

  return connected;
}
