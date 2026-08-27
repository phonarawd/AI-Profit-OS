import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
  sameOrigin,
} from "../../../../lib/admin-bff-server";

export const dynamic = "force-dynamic";

function noStore<T extends NextResponse>(response: T): T {
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

export function GET(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value?.trim() ?? "";
  return noStore(NextResponse.json({ connected: token.length > 0 }));
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return noStore(NextResponse.json({ connected: false, code: "ADMIN_SESSION_ORIGIN_DENIED" }, { status: 403 }));
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noStore(NextResponse.json({ connected: false, code: "ADMIN_SESSION_BODY_INVALID" }, { status: 400 }));
  }
  const token =
    body && typeof body === "object" && typeof (body as { token?: unknown }).token === "string"
      ? (body as { token: string }).token.trim()
      : "";
  if (!token || token.length > 8192 || token.split(".").length !== 3) {
    return noStore(NextResponse.json({ connected: false, code: "ADMIN_SESSION_TOKEN_INVALID" }, { status: 400 }));
  }
  const response = NextResponse.json({ connected: true, authority: "upstream" });
  response.cookies.set(ADMIN_SESSION_COOKIE, token, adminSessionCookieOptions());
  return noStore(response);
}

export function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) {
    return noStore(NextResponse.json({ connected: true, code: "ADMIN_SESSION_ORIGIN_DENIED" }, { status: 403 }));
  }
  const response = NextResponse.json({ connected: false });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    ...adminSessionCookieOptions(),
    maxAge: 0,
  });
  return noStore(response);
}
