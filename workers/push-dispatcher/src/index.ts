export interface Env {
  SERVICE: string;
  PHASE: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        service: env.SERVICE,
        phase: env.PHASE,
      });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // Phase0: Nest in-process emits → this Worker is deploy-ready stub.
    // Phase1+: subscribe NATS / queue and fan-out to Web Push.
    return Response.json({
      ok: true,
      service: env.SERVICE,
      phase: env.PHASE,
      status: "stub_accepted",
    });
  },
};
