/**
 * 테스트 전용. 앱 런타임 로더 아님.
 */
export async function resolve(specifier, context, nextResolve) {
  if (
    specifier.startsWith(".") &&
    !/\.(ts|js|mjs|cjs|json)$/.test(specifier)
  ) {
    for (const next of [`${specifier}.ts`, `${specifier}/index.ts`]) {
      try {
        return await nextResolve(next, context);
      } catch {
        /* try next */
      }
    }
  }
  return nextResolve(specifier, context);
}
