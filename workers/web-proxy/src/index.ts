/**
 * APP_HOST / apex / go → ai-profit-web.pages.dev (Phase0 DNS bridge)
 * Pages 미배포 시 522 대신 Phase0 안내 HTML 반환.
 */
const TARGET = "https://ai-profit-web.pages.dev";

const HOLDING_HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>퍼뜩 · 준비 중</title>
  <style>
    body{font-family:system-ui,sans-serif;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0b0f14;color:#e8eef5}
    main{max-width:28rem;padding:2rem;text-align:center}
    h1{font-size:1.5rem;margin:0 0 .5rem}
    p{opacity:.8;line-height:1.6;margin:0}
  </style>
</head>
<body>
  <main>
    <h1>퍼뜩</h1>
    <p>도메인 연결 완료 · 앱 배포 준비 중입니다.</p>
  </main>
</body>
</html>`;

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      const incoming = new URL(request.url);
      const target = new URL(incoming.pathname + incoming.search, TARGET);
      const headers = new Headers(request.headers);
      headers.set("host", "ai-profit-web.pages.dev");
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
