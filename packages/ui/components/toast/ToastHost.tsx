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

function splitToast(message: string): { emoji: string; title: string; body: string } {
  const [head = "", ...rest] = message.split("\n");
  const match = head.match(/^(\p{Extended_Pictographic}\uFE0F?)\s*(.*)$/u);
  return {
    emoji: match?.[1] ?? "",
    title: (match?.[2] ?? head).trim(),
    body: rest.join("\n").trim(),
  };
}

const TONE_BAR: Record<ResolvedToast["tone"], string> = {
  error: "#e5484d",
  success: "#34d399",
  info: "#2f7bff",
};

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

  const parts = current ? splitToast(current.message) : null;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {current && parts ? (
        <div
          data-testid="toast-host"
          data-toast-code={current.code}
          data-toast-tone={current.tone}
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 88,
            zIndex: 60,
            display: "flex",
            justifyContent: "center",
            padding: "0 16px",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              pointerEvents: "auto",
              position: "relative",
              width: "min(100%, 420px)",
              minHeight: 84,
              overflow: "hidden",
              border: "1px solid #26364d",
              borderRadius: 16,
              background: "#0d1726",
              color: "#fff",
              transform: "translateY(0)",
              opacity: 1,
            }}
          >
            <span
              aria-hidden
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: 4,
                height: "100%",
                background: TONE_BAR[current.tone],
              }}
            />
            <button
              type="button"
              onClick={dismiss}
              style={{
                display: "grid",
                gridTemplateColumns: "34px 1fr",
                gap: 10,
                width: "100%",
                minHeight: 84,
                padding: "13px 16px 13px 17px",
                border: 0,
                background: "transparent",
                color: "inherit",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 20, lineHeight: "28px" }} aria-hidden>
                {parts.emoji}
              </span>
              <span>
                <span
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    lineHeight: "20px",
                  }}
                >
                  {parts.title || current.message}
                </span>
                {parts.body ? (
                  <span
                    style={{
                      display: "block",
                      marginTop: 4,
                      color: "#b7c0ce",
                      fontSize: 12,
                      lineHeight: "18px",
                    }}
                  >
                    {parts.body}
                  </span>
                ) : null}
                <span className="sr-only">{T.common.close}</span>
              </span>
            </button>
          </div>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}
