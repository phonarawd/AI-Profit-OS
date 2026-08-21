"use client";

import {
  fetchAuthSession,
  isAuthError,
  logoutAuth,
} from "@aipo/sdk/auth";
import { useEffect, useState } from "react";
import { AccountHub } from "./AccountHub";
import type { AccountView } from "./AccountFrame";

function sessionToken(): string | null {
  return null;
}

export function ProfileClient() {
  const [view, setView] = useState<AccountView>("loading");
  const [stage, setStage] = useState<string | null>(null);
  const [logoutView, setLogoutView] = useState<"idle" | "saving" | "unavailable">(
    "idle",
  );

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      try {
        const session = await fetchAuthSession({
          getAccessToken: sessionToken,
          signal: ac.signal,
        });
        if (ac.signal.aborted) return;
        if (!session) {
          setStage(null);
          setView("unauthorized");
          return;
        }
        setStage(session.onboardingStage);
        setView("ready");
      } catch (err) {
        if (ac.signal.aborted) return;
        if (isAuthError(err) && err.status === 401) {
          setStage(null);
          setView("unauthorized");
          return;
        }
        setStage(null);
        setView("unavailable");
      }
    })();
    return () => ac.abort();
  }, []);

  async function logout() {
    setLogoutView("saving");
    try {
      await logoutAuth({ getAccessToken: sessionToken });
      setStage(null);
      setView("unauthorized");
      setLogoutView("idle");
    } catch {
      setLogoutView("unavailable");
    }
  }

  return (
    <AccountHub
      view={view}
      stage={stage}
      logoutView={logoutView}
      onLogout={() => void logout()}
    />
  );
}
