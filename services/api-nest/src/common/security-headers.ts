/**
 * REL-401 — Nest applies the shared security-header SSOT.
 * 두 번째 헤더 테이블을 만들지 않는다.
 */
import { createRequire } from "node:module";
import { join } from "node:path";

const requireCjs = createRequire(__filename);
const ssot = requireCjs(
  join(
    __dirname,
    "..",
    "..",
    "..",
    "..",
    "tooling",
    "security",
    "security-headers.cjs",
  ),
) as {
  applyToExpressResponse: (
    res: { setHeader: (key: string, value: string) => void },
    kind: string,
  ) => void;
};

export function securityHeadersMiddleware(
  _req: unknown,
  res: { setHeader: (key: string, value: string) => void },
  next: () => void,
): void {
  ssot.applyToExpressResponse(res, "api");
  next();
}
