"use client";

import { fetchAuthSession } from "@aipo/sdk/auth";
import { useEffect, useState } from "react";

export type AccountSessionState = "loading" | "auth" | "guest" | "error";

export function useAccountSession(): AccountSessionState {
  const [state, setState] = useState<AccountSessionState>("loading");

  useEffect(() => {
    const ac = new AbortController();
    void fetchAuthSession({ apiBase: "", signal: ac.signal })
      .then((session) => setState(session ? "auth" : "guest"))
      .catch(() => setState("error"));
    return () => ac.abort();
  }, []);

  return state;
}
