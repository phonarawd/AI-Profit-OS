/** ygoprodeck-adapter — Phase0 stub · Phase1+ NATS/adapters todo */
export default {
  async fetch(): Promise<Response> {
    return Response.json({ ok: true, worker: "ygoprodeck-adapter", phase: "stub" });
  },
};
