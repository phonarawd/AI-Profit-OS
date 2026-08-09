/**
 * OPS_HOST → ai-profit-ops.pages.dev (Phase0 DNS bridge)
 */
const TARGET = "https://ai-profit-ops.pages.dev";

const HOLDING_HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="robots" content="noindex,nofollow" />
  <title>Ops · 준비 중</title>
</head>
<body><p>Admin Ops · 도메인 연결 완료 · 배포 준비 중</p></body>
</html>`;

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      const incoming = new URL(request.url);
      const target = new URL(incoming.pathname + incoming.search, TARGET);
      const headers = new Headers(request.headers);
      headers.set("host", "ai-profit-ops.pages.dev");
      headers.set("x-forwarded-host", incoming.host);
      const res = await fetch(
        new Request(target.toString(), {
          method: request.method,
          headers,
          body: request.body,
          redirect: "manual",
        })
      );
      if (res.status >= 520) {
        return new Response(HOLDING_HTML, {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
        });
      }
      return res;
    } catch {
      return new Response(HOLDING_HTML, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
      });
    }
  },
};
