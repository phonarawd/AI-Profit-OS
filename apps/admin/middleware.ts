import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decideCfAccess } from "./lib/cf-access-jwt";

/**
 * Next 16 proxy.ts 는 Node runtime 고정이라 OpenNext Cloudflare가 거부한다.
 * Edge middleware.ts 만 Workers에서 Access JWT를 막을 수 있다.
 */
export async function middleware(request: NextRequest) {
  const decision = await decideCfAccess(request);
  if (decision.action === "next") {
    return NextResponse.next();
  }
  return new NextResponse(decision.body, {
    status: decision.status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
