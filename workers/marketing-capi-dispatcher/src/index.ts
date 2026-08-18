export interface Env {
  SERVICE: string;
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

    // M1+: consent-checked events from api-nest marketing-attribution
    return Response.json({
      ok: true,
      service: env.SERVICE,
      status: "stub_accepted",
      note: "Wire Meta/TikTok/Google CAPI after marketing-attribution lands",
    });
  },
};
