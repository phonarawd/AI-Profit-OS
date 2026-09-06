/* REL-014 native shell + REL-020 push/badge + S3/3.5 cache safety. */
/* PUTDUK-owned cache only. Foreign app caches are not deleted. */
const PUTDUK_CACHE_PREFIX = "putduk-";
const SHELL_CACHE = "putduk-shell-v1";
const REQUIRED_SHELL_URLS = ["/offline.html", "/manifest.webmanifest"];
const OPTIONAL_SHELL_URLS = [
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-180.png",
];
const SHELL_URLS = REQUIRED_SHELL_URLS.concat(OPTIONAL_SHELL_URLS);

function isPutdukCache(key) {
  return String(key || "").startsWith(PUTDUK_CACHE_PREFIX);
}

function isSensitivePath(pathname) {
  const p = String(pathname || "");
  if (p.startsWith("/api/")) return true;
  if (p.startsWith("/auth") || p.startsWith("/admin") || p.startsWith("/ops")) return true;
  if (p.startsWith("/wallet") || p.startsWith("/onboarding")) return true;
  if (p.startsWith("/trades") || p.startsWith("/profits")) return true;
  if (p.startsWith("/me/")) return true;
  return false;
}

function cacheAddAllSafe(cache, urls) {
  return Promise.all(urls.map((url) => cache.add(url).catch(() => undefined)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cacheAddAllSafe(cache, REQUIRED_SHELL_URLS).then(() =>
        cacheAddAllSafe(cache, OPTIONAL_SHELL_URLS),
      ),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => isPutdukCache(key) && key !== SHELL_CACHE)
          .map((key) => caches.delete(key)),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  const origin = event.origin;
  if (origin && origin !== self.location.origin) return;
  if (!origin && event.source && event.source.url) {
    try {
      if (new URL(event.source.url).origin !== self.location.origin) return;
    } catch {
      return;
    }
  }
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

function brandedOffline() {
  return caches.match("/offline.html").then((hit) => {
    if (hit) return hit;
    return new Response("<!doctype html><html lang=\"ko\"><meta charset=\"utf-8\"><title>퍼떡</title><p>연결이 끊겼어요. 다시 시도해 주세요.</p><p>충전·출금은 연결 후에 할 수 있어요.</p><button onclick=\"location.reload()\">다시 시도</button></html>", {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/favicon.ico" ||
    url.pathname === "/offline.html"
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => {
        if (isSensitivePath(url.pathname)) return brandedOffline();
        return brandedOffline();
      }),
    );
  }
});

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
  const title = String(payload.titleKo || "퍼떡");
  const body = String(payload.bodyKo || "새 소식이 있어요");
  const href = String(payload.href || "/");
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
  const href = String((event.notification.data && event.notification.data.href) || "/");
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
