"use client";

import type { ReactNode } from "react";
import { T } from "../../copy/ko";
import "./auth-spark.css";

export type AuthShellTone = "login" | "signup" | "complete";

export function AuthShell({
  tone,
  title,
  sub,
  lead,
  children,
  sessionState,
}: {
  tone: AuthShellTone;
  title: string;
  sub: string;
  lead?: string;
  children: ReactNode;
  sessionState?: "guest" | "unavailable" | "ready" | "loading";
}) {
  return (
    <div
      className="authSpark"
      data-auth-chrome="v2"
      data-auth-tone={tone}
      data-session-state={sessionState}
    >
      <div className="authSparkSplit">
        <aside className="authSparkBrand" aria-hidden="true">
          <div className="authSparkLockup">
            <p className="authSparkWord">{T.brand.consumer}</p>
            <span className="authSparkBolt" aria-hidden>
              ↯
            </span>
          </div>
          <p className="authSparkTitle">{title}</p>
          <p className="authSparkSub">{sub}</p>
          {lead ? <p className="authSparkLead">{lead}</p> : null}
        </aside>
        <div className="authSparkMasthead">
          <div className="authSparkLockup">
            <span className="authSparkDot" aria-hidden />
            <p className="authSparkWord">{T.brand.consumer}</p>
            <span className="authSparkBolt" aria-hidden>
              ↯
            </span>
          </div>
          <p className="authSparkTitle">{title}</p>
          <p className="authSparkSub">{sub}</p>
        </div>
        <div className="authSparkForm">
          <div className="authSparkCard">{children}</div>
          <p className="authSparkFooter">{T.legal.operator.footerLine}</p>
        </div>
      </div>
    </div>
  );
}
