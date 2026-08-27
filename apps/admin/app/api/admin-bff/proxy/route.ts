import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  adminApiBase,
  safeAdminTarget,
  sameOrigin,
} from "../../../../lib/admin-bff-server";

export const dynamic = "force-dynamic";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

async function proxy(request: NextRequest): Promise<NextResponse> {
  const target = safeAdminTarget(request.nextUrl.searchParams.get("target"));
  if (!target) {
    return NextResponse.json({ code: "ADMIN_BFF_TARGET_INVALID" }, { status: 400 });
  }
  if (UNSAFE_METHODS.has(request.method) && !sameOrigin(request)) {
    return NextResponse.json({ code: "ADMIN_BFF_ORIGIN_DENIED" }, { status: 403 });
  }
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value?.trim() ?? "";
  if (!token) {
    return NextResponse.json({ code: "ADMIN_AUTH_REQUIRED" }, { status: 401 });
  }

  const headers = new Headers({
    Accept: request.headers.get("accept") || "application/json",
    Authorization: `Bearer ${token}`,
  });
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);

  let body: ArrayBuffer | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${adminApiBase()}${target}`, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
    });
  } catch {
    return NextResponse.json({ code: "ADMIN_UPSTREAM_UNAVAILABLE" }, { status: 503 });
  }

  const responseHeaders = new Headers();
  const upstreamType = upstream.headers.get("content-type");
  if (upstreamType) responseHeaders.set("Content-Type", upstreamType);
  responseHeaders.set("Cache-Control", "no-store, max-age=0");
  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
