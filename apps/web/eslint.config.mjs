/**
 * REL-011 — apps/web ESLint 9 flat config.
 * 최소 차단: 파서 구문 오류 + no-debugger.
 * 스타일/미사용 변수는 점진 확대. plans/docs는 이 패키지 밖이라 검사하지 않는다.
 */
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "coverage/**",
      "out/**",
      "**/*.md",
      "**/*.mdc",
      "public/**",
    ],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "no-debugger": "error",
    },
  },
);
