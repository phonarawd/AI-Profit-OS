"use client";

import { useEffect, useState } from "react";
import { usePeotteokChat } from "@aipo/sdk/peotteok";
import {
  PeotteokChat,
  PEOTTEOK_FALLBACK_CHIPS,
} from "@aipo/ui/components/peotteok";

/**
 * §6.4e /me/peotteok — Canon peotteok-chat
 * SSE · P칩 · G stream · S거절 · degrade · §27.10 voice
 */
export default function Page() {
  const { messages, chips, toneBand, busy, lastDone, send } = usePeotteokChat({
    getAccessToken: () => null,
    enabled: true,
    fallbackChips: PEOTTEOK_FALLBACK_CHIPS,
  });

  const [degradedToast, setDegradedToast] = useState(false);

  useEffect(() => {
    if (lastDone?.degraded) {
      setDegradedToast(true);
      const t = window.setTimeout(() => setDegradedToast(false), 0);
      return () => window.clearTimeout(t);
    }
  }, [lastDone]);

  return (
    <main className="p-6">
      <PeotteokChat
        messages={messages}
        chips={chips}
        toneBand={
          toneBand === "young" || toneBand === "mid" || toneBand === "senior"
            ? toneBand
            : "mid"
        }
        busy={busy}
        degradedToast={degradedToast}
        onSend={send}
      />
    </main>
  );
}
