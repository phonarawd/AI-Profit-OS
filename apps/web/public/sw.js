/* REL-014 — OpenNext Workers 정적 자산으로 서빙하는 동등 Service Worker.
 * @serwist/next webpack 플러그인은 OpenNext asset pipeline과 맞추지 않는다.
 * Push handler 0 · REL-022 범위 0 · native store listing 0 (POST-017).
 */
const SHELL_CACHE = "putduk-shell-v1";
const SHELL_URLS = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-180.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (data === "SKIP_WAITING" || (data && data.type === "SKIP_WAITING")) {
    self.skipWaiting();
  }
});

function cacheFirst(request) {
  return caches.match(request).then((hit) => {
    if (hit) return hit;
    return fetch(request).then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
      }
      return res;
    });
  });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 머니/원장 API는 캐시·오프라인 큐 금지. 네트워크만.
  if (url.pathname.startsWith("/api/")) return;

  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/favicon.ico"
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then((hit) => {
          if (hit) return hit;
          return new Response("연결이 끊겼어요. 다시 시도해 주세요", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }),
      ),
    );
  }
});
