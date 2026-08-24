"use client";

import { Fragment, type ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Recovery shell for the global Spark Dash rollout.
 * Founder-locked Home `/` and Account Hub `/me` are returned without any
 * additional DOM wrapper so their approved geometry/ancestor structure stays intact.
 * Nested `/me/**` utility/content routes remain eligible for the global shell.
 */
export function GlobalSparkBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const protectedSurface =
    pathname === "/" || pathname === "/me" || pathname.startsWith("/dev");

  if (protectedSurface) {
    return <Fragment>{children}</Fragment>;
  }

  return (
    <div
      className="spark-global-boundary"
      data-spark-global="on"
      data-spark-route={pathname}
    >
      {children}
    </div>
  );
}
