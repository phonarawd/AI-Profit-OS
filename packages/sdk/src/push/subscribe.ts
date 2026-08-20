/**
 * REL-020 웹 푸시 구독 클라이언트.
 * iOS는 홈화면 설치 후에만 권한을 요청한다.
 */

export type PushSubscribeOpts = {
  apiBase?: string;
  vapidPublicKey?: string;
  signal?: AbortSignal;
};

function apiUrl(apiBase: string, path: string): string {
  const base = (apiBase || "").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  const nav = navigator as Navigator & { standalone?: boolean };
  return Boolean(nav.standalone);
}

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function canRequestPush(): { ok: boolean; reason: string } {
  if (typeof window === "undefined") return { ok: false, reason: "ssr" };
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, reason: "unsupported" };
  }
  if (isIosDevice() && !isStandaloneDisplay()) {
    return { ok: false, reason: "ios_not_installed" };
  }
  return { ok: true, reason: "ready" };
}

export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(base64.replace(/-/g, "+").replace(/_/g, "/") + padding);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export async function fetchVapidPublicKey(
  opts: PushSubscribeOpts = {},
): Promise<string | null> {
  if (opts.vapidPublicKey) return opts.vapidPublicKey;
  const fromEnv = (
    globalThis as { process?: { env?: Record<string, string | undefined> } }
  ).process?.env?.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (fromEnv) return fromEnv;
  const res = await fetch(apiUrl(opts.apiBase ?? "", "/api/v1/me/push/vapid-public"), {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    signal: opts.signal,
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { available?: boolean; publicKey?: string };
  return json.available && json.publicKey ? json.publicKey : null;
}

export async function registerPushSubscription(
  opts: PushSubscribeOpts = {},
): Promise<{ ok: boolean; reason: string }> {
  const gate = canRequestPush();
  if (!gate.ok) return gate;
  const publicKey = await fetchVapidPublicKey(opts);
  if (!publicKey) return { ok: false, reason: "vapid_unavailable" };

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ||
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    }));
  const json = sub.toJSON();
  const res = await fetch(
    apiUrl(opts.apiBase ?? "", "/api/v1/me/push-subscriptions"),
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: json.keys,
        platform: "web",
      }),
      signal: opts.signal,
    },
  );
  if (!res.ok) return { ok: false, reason: `http_${res.status}` };
  return { ok: true, reason: "subscribed" };
}
