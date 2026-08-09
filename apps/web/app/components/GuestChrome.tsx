import type { ReactNode } from "react";

/**
 * Full-viewport guest chrome — hides 5-tab shell for auth/onboarding/landing.
 * PART5b may replace with route-group layouts.
 */
export function GuestChrome({ children }: { children: ReactNode }) {
  return (
    <div
      data-testid="guest-chrome"
      className="fixed inset-0 z-50 overflow-y-auto bg-lux-bg"
    >
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-8 sm:px-6">
        {children}
      </div>
    </div>
  );
}
