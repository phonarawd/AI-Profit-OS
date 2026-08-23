/**
 * REL-401 — apply frozen security headers on every Nest response.
 * Builder SSOT = tooling/security/http-headers.cjs
 */
import { createRequire } from "node:module";
import { join } from "node:path";

const req = createRequire(__filename);
const headers = req(
  join(__dirname, "..", "..", "..", "..", "tooling", "security", "http-headers.cjs"),
) as {
  applySecurityHeaders: (
    res: { setHeader: (key: string, value: string) => void },
    profile: "api" | "document",
  ) => void;
};

export function securityHeadersMiddleware(
  _req: unknown,
  res: { setHeader: (key: string, value: string) => void },
  next: () => void,
): void {
  headers.applySecurityHeaders(res, "api");
  next();
}
