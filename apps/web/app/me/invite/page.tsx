"use client";

import { InviteHome } from "@aipo/ui/components/invite";

/**
 * /me/invite — Canon invite-home · copy Owns=UI §5.9.1a
 * Amounts/ledger Owns=Money §51.5 (pointer only on this surface)
 */
export default function Page() {
  return (
    <div className="p-6">
      <InviteHome />
    </div>
  );
}
