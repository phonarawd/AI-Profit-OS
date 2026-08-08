/** ebay-adapter — Phase0 stub · Phase1+ NATS/adapters todo */
export default {
  async fetch(): Promise<Response> {
    return Response.json({ ok: true, worker: "ebay-adapter", phase: "stub" });
  },
};
