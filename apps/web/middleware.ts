import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Loopback QA only. Production OpenNext builds do not set LOCAL_WEB_RUNTIME_API_STUB,
 * so this matcher always falls through to the /api/v1 rewrite.
 * Home UI is not changed.
 */
const GUEST_HOME_READ = {
  viewState: "unauthorized",
  reasonCode: "home.read.auth_required",
  session: { status: "guest" },
  money: null,
  opportunity: null,
  growth: null,
  ledgerTotal: null,
  todayPossibleProfitUsdt: null,
  provenance: { todayPossibleProfitUsdt: null, ledgerTotal: null },
  domainFsm: null,
};

const AUTH_HOME_READ = {
  viewState: "ready_empty",
  reasonCode: "home.read.empty",
  session: { status: "authenticated" },
  money: null,
  opportunity: null,
  growth: null,
  ledgerTotal: null,
  todayPossibleProfitUsdt: null,
  provenance: { todayPossibleProfitUsdt: null, ledgerTotal: null },
  domainFsm: null,
};

export function middleware(req: NextRequest) {
  if (process.env.LOCAL_WEB_RUNTIME_API_STUB !== "1") {
    return NextResponse.next();
  }
  const path = req.nextUrl.pathname;
  const authenticated = req.headers.get("x-aipo-qa-session") === "authenticated";
  if (path === "/api/v1/me/home-read") {
    return NextResponse.json(
      authenticated ? AUTH_HOME_READ : GUEST_HOME_READ,
      { status: authenticated ? 200 : 401 },
    );
  }
  return NextResponse.json(
    { error: "unauthorized", viewState: "unauthorized" },
    { status: 401 },
  );
}

export const config = {
  matcher: ["/api/v1/:path*"],
};
