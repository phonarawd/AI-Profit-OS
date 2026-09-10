/**
 * 공개 health용 version/buildTime.
 * 런타임에서 env 전체를 읽지 않는다. baked 값은 빌드 스크립트가 JSON으로 넣는다.
 */

import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { join } from "node:path";

export const NEST_PACKAGE_VERSION = "0.0.0";

export type NestBuildInfo = {
  version: string;
  buildTime: string | null;
  bakedGitSha: string | null;
};

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
const SHA_RE = /^[0-9a-f]{7,40}$/i;

function sanitizeBuildTime(raw: unknown): string | null {
  const value = String(raw ?? "").trim();
  return ISO_RE.test(value) ? value : null;
}

function sanitizeSha(raw: unknown): string | null {
  const value = String(raw ?? "").trim();
  if (!SHA_RE.test(value)) return null;
  return value.toLowerCase();
}

export function nestBuildInfo(): NestBuildInfo {
  const generated = join(__dirname, "nest-build-info.generated.json");
  if (!existsSync(generated)) {
    return { version: NEST_PACKAGE_VERSION, buildTime: null, bakedGitSha: null };
  }
  try {
    const req = createRequire(__filename);
    const raw = req("./nest-build-info.generated.json") as {
      version?: unknown;
      buildTime?: unknown;
      bakedGitSha?: unknown;
    };
    const version =
      typeof raw.version === "string" && raw.version.trim()
        ? raw.version.trim().slice(0, 32)
        : NEST_PACKAGE_VERSION;
    return {
      version,
      buildTime: sanitizeBuildTime(raw.buildTime),
      bakedGitSha: sanitizeSha(raw.bakedGitSha),
    };
  } catch {
    return { version: NEST_PACKAGE_VERSION, buildTime: null, bakedGitSha: null };
  }
}
