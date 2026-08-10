"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type HomeChromeState = {
  scanStatus: string | null;
  setScanStatus: (v: string | null) => void;
};

const HomeChromeContext = createContext<HomeChromeState | null>(null);

/** layout AppHeader ↔ HomeExperience scan chip bridge */
export function HomeChromeProvider({ children }: { children: ReactNode }) {
  const [scanStatus, setScanStatusState] = useState<string | null>(null);
  const setScanStatus = useCallback((v: string | null) => {
    setScanStatusState(v);
  }, []);
  const value = useMemo(
    () => ({ scanStatus, setScanStatus }),
    [scanStatus, setScanStatus],
  );
  return (
    <HomeChromeContext.Provider value={value}>
      {children}
    </HomeChromeContext.Provider>
  );
}

export function useHomeChrome(): HomeChromeState {
  const ctx = useContext(HomeChromeContext);
  if (!ctx) {
    return {
      scanStatus: null,
      setScanStatus: () => undefined,
    };
  }
  return ctx;
}
