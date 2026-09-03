export interface Env {
  SERVICE: string;
  /** Dedicated inbound credential for manual/server-to-server CAPI dispatch. */
  MARKETING_CAPI_DISPATCH_TOKEN?: string;
}

function authorizeMarketingCapiDispatch(request: Request, env: Env): Response | null {
  const expected =
    typeof env.MARKETING_CAPI_DISPATCH_TOKEN === "string"
      ? env.MARKETING_CAPI_DISPATCH_TOKEN
      : "";
  if (!expected) {
    return Response.json(
      { ok: false, error: "MARKETING_CAPI_DISPATCH_TOKEN_UNAVAILABLE" },
      { status: 503 },
    );
  }

  const got = request.headers.get("x-marketing-capi-token") ?? "";
  if (got !== expected) {
    return Response.json(
      { ok: false, error: "MARKETING_CAPI_DISPATCH_TOKEN_INVALID" },
      { status: 401 },
    );
  }
  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ ok: true, service: env.SERVICE });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const denied = authorizeMarketingCapiDispatch(request, env);
    if (denied) return denied;

    // M1+: consent-checked events from api-nest marketing-attribution
    return Response.json({
      ok: true,
      service: env.SERVICE,
      status: "stub_accepted",
      note: "Wire Meta/TikTok/Google CAPI after marketing-attribution lands",
    });
  },
};
