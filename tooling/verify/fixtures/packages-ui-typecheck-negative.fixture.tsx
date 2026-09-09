/**
 * Negative fixture for verify:packages-ui-typecheck (D1-BLK-004, 2026-09-05).
 *
 * This file is NEVER imported by any real packages/ui module and is outside
 * packages/ui/tsconfig.json's own `include` glob (it lives under
 * tooling/verify/fixtures/, not packages/ui/**), so it never affects the real
 * standalone typecheck run. It exists solely so tooling/verify/packages-ui-
 * typecheck.cjs can prove its own negative-case detection is not vacuous: a
 * temporary tsconfig (generated + deleted at verify-time, never committed)
 * points ONLY at this file, using the exact same compilerOptions as the real
 * packages/ui/tsconfig.json, and the type error below MUST cause that run to
 * fail with a non-zero exit code.
 */
export function brokenAdd(a: number, b: number): number {
  return a + b;
}

// Intentional real type error (TS2322): a number is not assignable to a
// string-typed binding. If this line stops failing, the standalone
// packages/ui typecheck has silently lost real detection power.
const shouldFailTypecheck: string = brokenAdd(1, 2);

export { shouldFailTypecheck };
