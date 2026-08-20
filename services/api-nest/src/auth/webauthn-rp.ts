/**
 * REL-022 — Auth RP. Cloudflare 도메인만. Money step-up 정책 재사용/변경 0.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

export type AuthWebauthnRp = {
  rpId: string;
  appHost: string;
  origin: string;
  rpName: "퍼뜩";
};

export function loadAuthWebauthnRp(): AuthWebauthnRp {
  const manifestPath = join(
    __dirname,
    "..",
    "..",
    "..",
    "..",
    "infra",
    "domain.manifest.json",
  );
  const man = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    rootDomain?: string;
    env?: { APP_HOST?: string };
  };
  const appHost = String(man.env?.APP_HOST || "").trim();
  const rpId = String(man.rootDomain || "").trim();
  if (!appHost || !rpId) {
    throw new Error("domain.manifest missing APP_HOST or rootDomain");
  }
  return {
    rpId,
    appHost,
    origin: `https://${appHost}`,
    rpName: "퍼뜩",
  };
}
