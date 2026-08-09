"use client";

import { T } from "@aipo/ui/copy/ko";

/**
 * /me/invite — Canon invite-home · copy Owns=UI §5.9.1a
 * Amounts/ledger Owns=Money §51.5 (pointer only on this surface)
 */
export default function Page() {
  return (
    <main
      className="p-6 text-[var(--color-lux-text)]"
      data-canon="invite-home"
      data-money-pointer="Money §51.5"
      data-copy-owner="UI §5.9.1a"
    >
      <h1 className="text-xl font-semibold">{T.invite.title}</h1>
      <p className="mt-2 text-sm text-[var(--color-lux-text-muted)]">
        {T.invite.oneLiner}
      </p>
      <p className="mt-3 text-sm" data-block="noCap">
        {T.invite.noCap}
      </p>
      <p className="mt-2 text-sm text-[var(--color-lux-text-muted)]" data-block="poolWaitNote">
        {T.invite.poolWaitNote}
      </p>
      <p className="mt-2 text-xs text-[var(--color-lux-text-muted)]">
        {T.invite.moneyPointer}
      </p>
    </main>
  );
}
