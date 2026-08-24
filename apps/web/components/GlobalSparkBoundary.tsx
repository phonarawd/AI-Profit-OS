"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Recovery shell for the global Spark Dash rollout.
 * Founder-locked Home and Account Hub surfaces are deliberately excluded.
 */
export function GlobalSparkBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const protectedSurface =
    pathname === "/" || pathname.startsWith("/me") || pathname.startsWith("/dev");

  return (
    <div
      className="spark-global-boundary"
      data-spark-global={protectedSurface ? "off" : "on"}
      data-spark-route={pathname}
    >
      {children}
    </div>
  );
}
