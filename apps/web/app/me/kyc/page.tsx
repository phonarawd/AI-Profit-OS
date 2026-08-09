"use client";

import { T } from "@aipo/ui/copy/ko";

/**
 * §42 /me/kyc — Lux 3-step IA (guide → doc → confirm).
 * Canon wires: kyc-guide · kyc-doc-capture · kyc-confirm
 * Full capture UX deepens with UI todos; copy + IA locked here.
 */
export default function Page() {
  return (
    <main className="p-6 text-lux-text">
      <h1 className="text-xl font-semibold">{T.kyc.pageTitle}</h1>
      <p className="mt-2 text-sm text-lux-text-muted">
        {T.kyc.pageSubtitle}
      </p>
      <p className="mt-4 text-sm">{T.kyc.whyOnce}</p>
      <p className="mt-2 text-sm text-lux-text-muted">
        {T.kyc.storagePlain}
      </p>
      <p className="mt-4 text-sm">{T.kyc.steps123}</p>
      <button
        type="button"
        className="mt-6 rounded-lg bg-lux-accent px-4 py-2 text-sm text-white"
      >
        {T.kyc.start}
      </button>
    </main>
  );
}
