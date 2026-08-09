"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { T } from "../../copy/ko";
import type { ToastCode } from "../../copy/ko/toast";
import { shouldShowToast } from "./pushDedup";
import { resolveToastDetail, type ResolvedToast } from "./resolveToast";

type ShowToastInput = {
  code: ToastCode;
  vars?: Record<string, string | number>;
  sourceEventId?: string | null;
};

type ToastContextValue = {
  showToast: (input: ShowToastInput) => void;
  current: ResolvedToast | null;
  dismiss: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastHost");
  }
  return ctx;
}

/** Safe hook when host may be absent (optional surfaces) */
export function useOptionalToast(): ToastContextValue | null {
  return useContext(ToastContext);
}

export function ToastHost({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<ResolvedToast | null>(null);

  const dismiss = useCallback(() => setCurrent(null), []);

  const showToast = useCallback((input: ShowToastInput) => {
    if (
      !shouldShowToast({
        code: input.code,
        sourceEventId: input.sourceEventId,
      })
    ) {
      return;
    }
    setCurrent(resolveToastDetail(input.code, input.vars));
  }, []);

  const value = useMemo(
    () => ({ showToast, current, dismiss }),
    [showToast, current, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {current ? (
        <div
          data-testid="toast-host"
          data-toast-code={current.code}
          data-toast-tone={current.tone}
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 bottom-20 z-50 mx-auto max-w-md px-4 md:bottom-6"
        >
          <div className="rounded-lux-md border border-lux-border bg-lux-elevated px-4 py-3 text-sm text-lux-text shadow-lg">
            <p>{current.message}</p>
            <button
              type="button"
              className="mt-2 text-xs text-lux-text-muted underline"
              onClick={dismiss}
            >
              {T.common.close}
            </button>
          </div>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}
