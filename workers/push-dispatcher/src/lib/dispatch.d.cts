/**
 * dispatch.cjs 타입 선언 — Worker 엔트리(index.ts)가 CommonJS 라이브러리를 strict 모드로 import 할 수 있게 한다.
 * 런타임 구현은 dispatch.cjs 하나이며(tooling/pwa 하네스와 공유) 이 파일은 시그니처만 기술한다.
 */
export interface DispatcherEnv {
  SERVICE?: string;
  PHASE?: string;
  PUSH_ENABLED?: string;
  PUSH_DISPATCH_TOKEN?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
}

export interface DispatcherResult {
  statusCode: number;
  body: Record<string, unknown>;
}

export interface DispatchHooks {
  sendPush?: (...args: unknown[]) => unknown;
  [key: string]: unknown;
}

export function isPushEnabled(value: unknown): boolean;
export function normalizeSubscription(raw: unknown): Record<string, unknown> | null;
export function dispatchPush(input: Record<string, unknown>, hooks?: DispatchHooks): Record<string, unknown>;
export function handleDispatcherRequest(request: Request, env: DispatcherEnv, hooks?: DispatchHooks): Promise<DispatcherResult>;
export function planEmit(input: Record<string, unknown>): Record<string, unknown>;
