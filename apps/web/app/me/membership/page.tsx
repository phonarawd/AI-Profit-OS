"use client";

import { useEffect, useState } from "react";
import {
  MembershipHome,
  type MembershipMeModel,
} from "@aipo/ui/components/membership";

/**
 * /me/membership — Canon membership-home · UI §5.9.2c · §51.18a
 * Ladder/cap Owns=Engine §0.0.7 · Admin force=§9.8.10 pointer
 */
export default function Page() {
  const [data, setData] = useState<MembershipMeModel | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/v1/me/membership", {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (!res.ok || cancelled) {
          if (!cancelled) setData({ membership: "sprout", ladder: [] });
          return;
        }
        const json = (await res.json()) as MembershipMeModel;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setData({ membership: "sprout", ladder: [] });
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-6">
      <MembershipHome data={data} />
    </div>
  );
}
