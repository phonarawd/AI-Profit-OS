/* REL-014 native shell + REL-020 push/badge.
 * @serwist/next webpack 플러그인은 OpenNext asset pipeline과 맞추지 않는다.
 * REL-022 범위 0 · native store listing 0 (POST-017).
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

function safeNotificationHref(value) {
  const href = String(value || "").trim();
  if (
    !href ||
    href.length > 512 ||
    !href.startsWith("/") ||
    href.startsWith("//") ||
    href.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(href)
  ) {
    return "/";
  }
  return href;
}

function applyBadge(count) {
  const n = Number(count);
  if (!Number.isFinite(n) || n < 0) return Promise.resolve();
  const nav = self.navigator;
  if (n === 0 && nav && typeof nav.clearAppBadge === "function") {
    return nav.clearAppBadge().catch(() => undefined);
  }
  if (nav && typeof nav.setAppBadge === "function") {
    return nav.setAppBadge(n).catch(() => undefined);
  }
  return Promise.resolve();
}

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { bodyKo: event.data ? event.data.text() : "" };
  }
  const title = String(payload.titleKo || "퍼뜩");
  const body = String(payload.bodyKo || "새 소식이 있어요");
  const href = safeNotificationHref(payload.href);
  const badgeCount = payload.badgeCount;
  const sourceEventId = String(payload.sourceEventId || "").trim();
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body,
        data: { href, sourceEventId },
        tag: sourceEventId || undefined,
        renotify: false,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
      }),
      applyBadge(badgeCount),
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = safeNotificationHref(event.notification.data && event.notification.data.href);
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate?.(href);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(href);
      return undefined;
    }),
  );
});
