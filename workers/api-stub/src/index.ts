/**
 * api.hiptk.app Phase0 health stub — Nest 배포 전까지 503 + JSON
 * Replace with cloudflared/VPS when API_HOST live (Infra §51.13)
 */
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/api/v1/health" || url.pathname === "/health") {
      return Response.json(
        {
          status: "phase0_stub",
          service: "ai-profit-api",
          message: "Nest API_HOST pending deploy",
          host: "api.hiptk.app",
        },
        { status: 503, headers: { "cache-control": "no-store" } }
      );
    }
    return Response.json(
      { status: "phase0_stub", message: "API not deployed yet" },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  },
};
