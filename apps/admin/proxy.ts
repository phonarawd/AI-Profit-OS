import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decideCfAccess } from "./lib/cf-access-jwt";

export async function proxy(request: NextRequest) {
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
