/**
 * api.hiptk.app → Nest on Render (Phase0 DNS bridge)
 * Origin SSOT: workers/_shared/api-origin.ts
 */
import { NEST_API_ORIGIN } from "../../_shared/api-origin";

const TARGET = NEST_API_ORIGIN;
const TARGET_HOST = new URL(NEST_API_ORIGIN).host;

export default {
  async fetch(request: Request): Promise<Response> {
    const incoming = new URL(request.url);
    const target = new URL(incoming.pathname + incoming.search, TARGET);
    const headers = new Headers(request.headers);
    headers.set("host", TARGET_HOST);
    headers.set("x-forwarded-host", incoming.host);
    headers.set("x-forwarded-proto", "https");

    return fetch(
      new Request(target.toString(), {
        method: request.method,
        headers,
        body: request.body,
        redirect: "manual",
      }),
    );
  },
};
