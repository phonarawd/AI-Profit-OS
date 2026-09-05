/**
 * S1F Section 7 세션 유지 결함 수정.
 *
 * 백엔드는 이미 refresh-token rotation을 지원한다 (POST /api/v1/auth/refresh는
 * 만료된 access token 없이도 동작하도록 설계됨 - services/api-nest/src/auth/
 * auth.controller.ts 참고). 하지만 브라우저에서 이 endpoint를 실제로 호출하는
 * 곳이 하나도 없었다 (packages/sdk/src/auth/classic.ts의 refreshSession()은
 * 정의만 있고 호출 지점 0개). 실제 결과: 로그인한 사용자의 access token
 * (ACCESS_TOKEN_TTL_SEC = 15분)이 조용히 만료되면 이후 모든 /api/v1/* 호출이
 * 재시도 없이 401을 반환했다 - 30일짜리 유효한 refresh 쿠키가 분명히 있는데도
 * 로그아웃된 것과 구분이 안 되는 상태였다.
 *
 * 이 모듈은 window.fetch를 한 번만 감싸서: 우리 API에서 온 401 응답을 감지하고
 * (아래 SKIP 목록의 "세션이 필요 없는 공개 auth endpoint"는 제외 - 무한루프와
 * 불필요한 refresh 시도를 막기 위함), /api/v1/auth/refresh를 정확히 한 번만
 * 호출한 뒤(동시에 여러 요청이 401을 받아도 공유된 in-flight promise로 중복
 * 호출을 막는다 - refresh를 동시에 두 번 호출하면 서버의 재사용 탐지 로직이
 * 발동해 세션 family 전체가 폐기되는, 지금 고치려는 버그보다 더 나쁜 자폭성
 * 로그아웃 버그가 생긴다), 원래 요청을 정확히 한 번만 재시도한다.
 */

const REFRESH_PATH = "/api/v1/auth/refresh";

/**
 * 세션이 없는 게 정상인 공개 auth 절차 경로. 실패한 로그인 시도나 아직
 * 로그인하지 않은 방문자의 회원가입/복구 흐름에서 온 401을 refresh 시도로
 * 잘못 해석하지 않기 위해 명시적으로 제외한다.
 */
const SKIP_REFRESH_RETRY_PATH_PREFIXES: readonly string[] = [
  REFRESH_PATH,
  "/api/v1/auth/login",
  "/api/v1/auth/signup",
  "/api/v1/auth/password-reset",
  "/api/v1/auth/find-id",
  "/api/v1/auth/magic-link",
  "/api/v1/auth/oauth",
  "/api/v1/auth/passkey",
  "/api/v1/auth/email",
];

function extractPathname(input: RequestInfo | URL): string | null {
  try {
    if (typeof input === "string") {
      return new URL(input, window.location.origin).pathname;
    }
    if (input instanceof URL) return input.pathname;
    if (typeof Request !== "undefined" && input instanceof Request) {
      return new URL(input.url, window.location.origin).pathname;
    }
  } catch {
    return null;
  }
  return null;
}

export function shouldAttemptRefreshRetry(pathname: string | null): boolean {
  if (!pathname || !pathname.startsWith("/api/")) return false;
  return !SKIP_REFRESH_RETRY_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

let sharedRefreshPromise: Promise<boolean> | null = null;

/**
 * Cross-tab coordination lock name. Any origin-scoped context (tab,
 * window, worker) requesting this same name is queued by the browser -
 * only the holder actually calls the refresh endpoint.
 *
 * Bug this closes: sharedRefreshPromise above is a plain module-level
 * variable, so it only dedupes concurrent 401s within ONE tab's own JS
 * heap. Two tabs of the same session hitting a 401 around the same time
 * (their access tokens share the same 15-minute TTL, so this is common,
 * not rare) each had their own sharedRefreshPromise and both called
 * POST /api/v1/auth/refresh with the SAME still-valid refresh cookie at
 * nearly the same time. The server's rotation reuse-detection
 * (session-rotation.service.ts) exists specifically to treat a second
 * concurrent use of a token as a stolen/replayed token and revokes the
 * ENTIRE session family - so two tabs racing to refresh could log the
 * user out of every tab and device in that family, which is strictly
 * worse than the "silently logged out after 15 minutes" bug this module
 * was written to fix in the first place.
 */
const REFRESH_LOCK_NAME = "putduk-session-refresh-v1";

type LockManagerLike = {
  request<T>(name: string, callback: () => Promise<T>): Promise<T>;
};

function getLockManager(): LockManagerLike | null {
  if (typeof navigator === "undefined") return null;
  const withLocks = navigator as Navigator & { locks?: LockManagerLike };
  return withLocks.locks ?? null;
}

async function doRefreshRequest(originalFetch: typeof fetch): Promise<boolean> {
  try {
    const res = await originalFetch(REFRESH_PATH, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    return res.ok;
  } catch {
    return false;
  }
}

function refreshOnce(originalFetch: typeof fetch): Promise<boolean> {
  if (!sharedRefreshPromise) {
    const locks = getLockManager();
    sharedRefreshPromise = (
      locks
        ? locks.request(REFRESH_LOCK_NAME, () => doRefreshRequest(originalFetch))
        : doRefreshRequest(originalFetch)
    ).finally(() => {
      sharedRefreshPromise = null;
    });
  }
  return sharedRefreshPromise;
}

/**
 * A `Request` instance's body is a single-read stream - fetch() consumes
 * it, and reusing the same `Request` object for the post-refresh retry
 * would throw ("body stream already read") instead of safely retrying.
 * Cloning before the first attempt (never after - once consumed there is
 * nothing left to clone) keeps one untouched copy available for the
 * retry. Plain string/Blob/URLSearchParams/FormData bodies on `init.body`
 * are not single-read streams and need no such handling.
 */
function cloneForRetry(input: RequestInfo | URL): RequestInfo | URL {
  if (typeof Request !== "undefined" && input instanceof Request) {
    return input.clone();
  }
  return input;
}

let installed = false;

/**
 * 앱 부팅 시 정확히 한 번만 호출한다 (SessionRefreshRuntime 컴포넌트 참고).
 * 이미 설치돼 있으면 아무것도 하지 않는다 (HMR/중복 마운트 안전).
 */
export function installSessionRefreshFetch(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const retryInput = cloneForRetry(input);
    const res = await originalFetch(input, init);
    if (res.status !== 401) return res;

    const pathname = extractPathname(input);
    if (!shouldAttemptRefreshRetry(pathname)) return res;

    const refreshed = await refreshOnce(originalFetch);
    if (!refreshed) return res;

    return originalFetch(retryInput, init);
  };
}
